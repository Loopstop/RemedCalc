import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Calculator, ClipboardList, Droplets, PackageCheck, Pill, Plus, Save, Syringe } from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'remedcalc.receitas.v1';

const initialForm = {
  mode: 'comprimidos',
  dose: '0',
  intervalHours: '0',
  treatmentDays: '0',
  unitsPerBlister: '0',
  blistersPerBox: '0',
  mlPerBottle: '100',
  insulinMode: 'tubete',
  insulinMorning: '0',
  insulinAfternoon: '0',
  insulinNight: '0',
  insulinLunch: '0',
  insulinDinner: '0',
  insulinDays: '30',
};

const roundUp = (value) => Math.ceil((Number(value) || 0) * 1000) / 1000;
const positiveNumber = (value) => Math.max(Number(value) || 0, 0);
const nextName = (prefix, length) => `${prefix} ${length + 1}`;

function Field({ label, value, onChange, min = '0', step = 'any', suffix, help }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="inputWrap">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix && <strong>{suffix}</strong>}
      </div>
      {help && <small>{help}</small>}
    </label>
  );
}

function ResultCard({ title, value, detail, className }) {
  return (
    <article className={`resultCard ${className || ''}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function summarizeMedicine(medicine) {
  const type = medicine.mode === 'ml' ? 'Líquido' : medicine.mode === 'insulina' ? 'Insulina' : 'Comprimido';
  const unit = medicine.mode === 'ml' ? 'mL' : medicine.mode === 'insulina' ? 'UI' : 'comprimido(s)';
  const total = medicine.deliveredTotal ?? medicine.totalWithReserve ?? medicine.total;
  const days = medicine.deliveryDays || medicine.treatmentDays || 0;
  return `${type}: ${total} ${unit} por ${days} dia(s)${medicine.mode === 'insulina' ? '' : `, ${medicine.dose} ${medicine.mode === 'ml' ? 'mL' : 'comp.'} de ${medicine.intervalHours} em ${medicine.intervalHours} horas`}`;
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [currentMedicines, setCurrentMedicines] = useState([]);
  const [recipes, setRecipes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  }, [recipes]);

  const setValue = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const result = useMemo(() => {
    if (form.mode === 'insulina') {
      const totalUi = positiveNumber(form.insulinMorning) + positiveNumber(form.insulinAfternoon) + positiveNumber(form.insulinNight) + positiveNumber(form.insulinLunch) + positiveNumber(form.insulinDinner);
      const divisor = form.insulinMode === 'tubete' ? 300 : 1000;
      const days = positiveNumber(form.insulinDays);
      const base = totalUi * days / divisor;
      const useUnits = base;
      const deliverUnits = Number.isInteger(base) ? base + 1 : Math.ceil(base);
      return {
        useLabel: form.insulinMode === 'tubete' ? 'Tubetes a usar' : 'Frascos a usar',
        useUnits,
        primaryLabel: form.insulinMode === 'tubete' ? 'Tubetes a entregar' : 'Frascos a entregar',
        deliveredTotal: deliverUnits,
        total: deliverUnits,
        totalWithReserve: deliverUnits,
        packageALabel: form.insulinMode === 'tubete' ? 'tubete(s)' : 'frasco(s)',
        packageA: deliverUnits,
        packageADetail: divisor === 300 ? 'Dividido por 300 UI' : 'Dividido por 1000 UI',
      };
    }

    const dose = positiveNumber(form.dose);
    const intervalHours = positiveNumber(form.intervalHours);
    const treatmentDays = positiveNumber(form.treatmentDays);
    const deliveryDays = treatmentDays;
    const dosesPerDay = intervalHours > 0 ? 24 / intervalHours : 0;
    const totalDoseUnits = dose * dosesPerDay * deliveryDays;
    const totalWithReserve = totalDoseUnits;

    if (form.mode === 'ml') {
      const mlPerBottle = positiveNumber(form.mlPerBottle);
      const bottles = mlPerBottle > 0 ? Math.ceil(totalWithReserve / mlPerBottle) : 0;
      return {
        deliveryDays,
        dosesPerDay,
        total: roundUp(totalDoseUnits),
        totalWithReserve: roundUp(totalWithReserve),
        deliveredTotal: mlPerBottle > 0 ? bottles * mlPerBottle : totalWithReserve,
        primaryLabel: 'mL a entregar',
        packageA: bottles,
        packageALabel: 'frasco(s)',
        packageADetail: mlPerBottle ? `${mlPerBottle} mL por frasco` : 'Informe o volume do frasco',
        warning: '',
        stockDurationDays: deliveredTotal > 0 && dosesPerDay > 0 ? deliveredTotal / totalWithReserve * deliveryDays : 0,
      };
    }

    const unitsPerBlister = positiveNumber(form.unitsPerBlister);
    const blistersPerBox = positiveNumber(form.blistersPerBox);
    const unitsPerBox = unitsPerBlister * blistersPerBox;
    const blisters = unitsPerBlister > 0 ? Math.ceil(totalWithReserve / unitsPerBlister) : 0;
    const boxes = unitsPerBox > 0 ? Math.ceil(totalWithReserve / unitsPerBox) : 0;

    return {
      deliveryDays,
      dosesPerDay,
      total: roundUp(totalDoseUnits),
      totalWithReserve: roundUp(totalWithReserve),
      deliveredTotal: unitsPerBlister > 0 ? blisters * unitsPerBlister : totalWithReserve,
      primaryLabel: 'comprimido(s) a entregar',
      packageA: blisters,
      packageALabel: 'cartela(s)',
      packageADetail: unitsPerBlister ? `${unitsPerBlister} comprimidos por cartela` : 'Informe a cartela',
      packageB: boxes,
      packageBLabel: 'caixa(s)',
      packageBDetail: unitsPerBox ? `${unitsPerBox} comprimidos por caixa` : 'Informe cartelas por caixa',
      warning: '',
      stockDurationDays: deliveredTotal > 0 && dosesPerDay > 0 ? (deliveredTotal / (dose * dosesPerDay)) : 0,
    };
  }, [form]);

  const isMl = form.mode === 'ml';
  const isInsulin = form.mode === 'insulina';
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId) || recipes.at(-1) || null;

  const buildMedicine = () => {
    const base = {
      id: crypto.randomUUID(),
      mode: form.mode,
      total: result.total,
      totalWithReserve: result.totalWithReserve,
      deliveredTotal: result.deliveredTotal,
      packageALabel: result.packageALabel,
      packageA: result.packageA,
    };
    if (form.mode === 'insulina') {
      return {
        ...base,
        name: nextName('Insulina', currentMedicines.length),
        insulinMode: form.insulinMode,
        insulinMorning: positiveNumber(form.insulinMorning),
        insulinAfternoon: positiveNumber(form.insulinAfternoon),
        insulinNight: positiveNumber(form.insulinNight),
        insulinLunch: positiveNumber(form.insulinLunch),
        insulinDinner: positiveNumber(form.insulinDinner),
      };
    }
    return {
      ...base,
      name: nextName('Remédio', currentMedicines.length),
      dose: positiveNumber(form.dose),
      intervalHours: positiveNumber(form.intervalHours),
      treatmentDays: positiveNumber(form.treatmentDays),
      deliveryDays: result.deliveryDays,
      packageBLabel: result.packageBLabel,
      packageB: result.packageB,
    };
  };

  const addMedicine = () => {
    setCurrentMedicines((items) => [...items, buildMedicine()]);
    setForm(initialForm);
  };

  const startNewRecipe = () => {
    const medicines = currentMedicines.length ? currentMedicines : [buildMedicine()];

    const recipe = {
      id: crypto.randomUUID(),
      name: nextName('Receita', recipes.length),
      createdAt: new Date().toLocaleString('pt-BR'),
      medicines,
    };

    setRecipes((items) => [...items, recipe]);
    setSelectedRecipeId(recipe.id);
    setCurrentMedicines([]);
    setForm(initialForm);
  };

  return (
    <main className="page appShell">
      <aside className="historyPanel">
        <div className="panelTitle">
          <ClipboardList size={20} />
          <strong>Receitas</strong>
        </div>
        {recipes.length ? (
          <div className="recipeList">
            {recipes.map((recipe) => (
              <button
                key={recipe.id}
                className={recipe.id === selectedRecipe?.id ? 'recipeButton active' : 'recipeButton'}
                onClick={() => setSelectedRecipeId(recipe.id)}
              >
                <strong>{recipe.name}</strong>
                <span>{recipe.medicines.length} remédio(s)</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="emptyText">Nenhuma receita arquivada.</p>
        )}
      </aside>

      <section className="centerColumn">
        <section className="hero">
          <div>
            <p className="eyebrow">Farmácia · dispensação</p>
            <h1>Calculadora de dispensação</h1>
            <p>Calcule rapidamente quantidade a entregar por período, dose, intervalo e apresentação do medicamento.</p>
          </div>
          <div className="heroIcon"><Calculator size={54} /></div>
        </section>

        <section className="panel">
          <div className="tabs" role="tablist" aria-label="Tipo de medicamento">
            <button className={!isMl && !isInsulin ? 'active' : ''} onClick={() => setValue('mode')('comprimidos')}>
              <Pill size={18} /> Comprimidos
            </button>
            <button className={isMl ? 'active' : ''} onClick={() => setValue('mode')('ml')}>
              <Droplets size={18} /> Líquidos / mL
            </button>
            <button className={isInsulin ? 'active' : ''} onClick={() => setValue('mode')('insulina')}>
              <Syringe size={18} /> Insulina
            </button>
          </div>

          <div className="grid">
            {isInsulin ? (
              <>
                <div className="field insulin-presentation">
                  <span>Apresentação</span>
                  <div className="inputWrap">
                    <label className="radio">
                      <input type="radio" name="insulinMode" value="tubete" checked={form.insulinMode === 'tubete'} onChange={() => setValue('insulinMode')('tubete')} />
                      <span>Tubete</span>
                    </label>
                    <label className="radio">
                      <input type="radio" name="insulinMode" value="frasco" checked={form.insulinMode === 'frasco'} onChange={() => setValue('insulinMode')('frasco')} />
                      <span>Frasco</span>
                    </label>
                  </div>
                </div>

                <Field label="Manhã" value={form.insulinMorning} onChange={setValue('insulinMorning')} suffix="UI" />
                <Field label="Tarde" value={form.insulinAfternoon} onChange={setValue('insulinAfternoon')} suffix="UI" />
                <Field label="Noite" value={form.insulinNight} onChange={setValue('insulinNight')} suffix="UI" />
                <Field label="Almoço" value={form.insulinLunch} onChange={setValue('insulinLunch')} suffix="UI" />
                <Field label="Jantar" value={form.insulinDinner} onChange={setValue('insulinDinner')} suffix="UI" />
                <Field label="Dias de tratamento" value={form.insulinDays} onChange={setValue('insulinDays')} suffix="dias" />
              </>
            ) : (
              <>
                <Field label={isMl ? 'Volume por dose' : 'Comprimidos por dose'} value={form.dose} onChange={setValue('dose')} suffix={isMl ? 'mL' : 'comp.'} />
                <Field label="Intervalo entre doses" value={form.intervalHours} onChange={setValue('intervalHours')} suffix="horas" help="Ex.: de 8 em 8 horas = 8" />
                <Field label="Duração do tratamento" value={form.treatmentDays} onChange={setValue('treatmentDays')} suffix="dias" />

                {isMl ? (
                  <Field label="Volume por frasco" value={form.mlPerBottle} onChange={setValue('mlPerBottle')} suffix="mL" />
                ) : (
                  <>
                    <Field label="Comprimidos por cartela" value={form.unitsPerBlister} onChange={setValue('unitsPerBlister')} suffix="comp." />
                    <Field label="Cartelas por caixa" value={form.blistersPerBox} onChange={setValue('blistersPerBox')} suffix="cart." />
                  </>
                )}
              </>
            )}
          </div>

          <div className="actions">
            <button className="secondaryAction" onClick={addMedicine}><Plus size={18} /> Adicionar medicamento</button>
            <button className="primaryAction" onClick={startNewRecipe}><Save size={18} /> Nova receita</button>
          </div>
        </section>

        <section className="results" aria-live="polite">
          {isInsulin ? (
            <>
              <ResultCard title="Total de UI/dia" value={positiveNumber(form.insulinMorning) + positiveNumber(form.insulinAfternoon) + positiveNumber(form.insulinNight) + positiveNumber(form.insulinLunch) + positiveNumber(form.insulinDinner)} detail="Soma dos 5 períodos" />
              <ResultCard title={result.useLabel} value={roundUp(result.useUnits)} detail="Valor exato do cálculo" />
              <ResultCard className="primary" title={result.primaryLabel} value={result.deliveredTotal} detail={result.packageADetail} />
            </>
          ) : (
            <>
              <ResultCard title="Frequência diária" value={`${roundUp(result.dosesPerDay)} dose(s)/dia`} detail={`Entrega calculada para ${result.deliveryDays} dia(s)`} />
              <ResultCard className="primary" title={result.primaryLabel} value={result.deliveredTotal} detail={`${result.total} calculado`} />
              <ResultCard title="Duração do estoque" value={`${roundUp(result.stockDurationDays)} dia(s)`} detail="Baseado na quantidade entregue" />
              <ResultCard title={result.packageALabel} value={result.packageA} detail={result.packageADetail} />
              {!isMl && <ResultCard title={result.packageBLabel} value={result.packageB} detail={result.packageBDetail} />}
            </>
          )}
        </section>

        <section className="formula">
          <PackageCheck size={20} />
          <p>
            {isInsulin
              ? `Fórmula: (soma das UIs × 30 dias) ÷ ${form.insulinMode === 'tubete' ? '300' : '1000'}. A quantidade é arredondada para cima.`
              : 'Fórmula: quantidade = dose × (24 ÷ intervalo em horas) × dias de entrega. As embalagens são arredondadas para cima, então a quantidade entregue pode ser maior que o cálculo exato.'}
          </p>
        </section>

        <p className="buildBadge">Versão: histórico local · v2</p>
      </section>

      <aside className="historyPanel detailPanel">
        <div className="panelTitle">
          <ClipboardList size={20} />
          <strong>Histórico</strong>
        </div>

        {currentMedicines.length > 0 && (
          <section className="currentBox">
            <strong>Receita atual</strong>
            {currentMedicines.map((medicine) => (
              <p key={medicine.id}>{medicine.name}: {summarizeMedicine(medicine)}</p>
            ))}
          </section>
        )}

        {selectedRecipe ? (
          <section className="recipeDetail">
            <h2>{selectedRecipe.name}</h2>
            <span>{selectedRecipe.createdAt}</span>
            {selectedRecipe.medicines.map((medicine) => (
              <article key={medicine.id} className="medicineItem">
                <h3>{medicine.name}</h3>
                <p>{summarizeMedicine(medicine)}</p>
                <small>
                  Embalagem: {medicine.packageA} {medicine.packageALabel}
                  {medicine.packageB ? ` · ${medicine.packageB} ${medicine.packageBLabel}` : ''}
                </small>
              </article>
            ))}
          </section>
        ) : (
          <p className="emptyText">Selecione uma receita para ver o histórico.</p>
        )}
      </aside>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
