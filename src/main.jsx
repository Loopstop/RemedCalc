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
  deliveryDays: '0',
  reservePercent: '0',
  unitsPerBlister: '0',
  blistersPerBox: '0',
  mlPerBottle: '0',
  insulinMode: 'tubete',
  insulinMorning: '0',
  insulinAfternoon: '0',
  insulinNight: '0',
  insulinLunch: '0',
  insulinDinner: '0',
  insulinDays: '30',
  weekly: '0',
};

const resetPackagingFields = () => ({
  unitsPerBlister: '0',
  blistersPerBox: '0',
  mlPerBottle: '0',
});

const roundUp = (value) => Math.ceil((Number(value) || 0) * 1000) / 1000;
const positiveNumber = (value) => Math.max(Number(value) || 0, 0);
const nextName = (prefix, length) => `${prefix} ${length + 1}`;

function Field({ label, value, onChange, min = '0', step = 'any', suffix, help, ...inputProps }) {
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
          {...inputProps}
        />
        {suffix && <strong>{suffix}</strong>}
      </div>
      {help && <small>{help}</small>}
    </label>
  );
}

function ResultCard({ title, value, detail }) {
  return (
    <article className="resultCard">
      <span>{title}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}

function summarizeMedicine(medicine) {
  if (medicine.mode === 'insulina') {
    const total = medicine.deliveredTotal ?? medicine.totalWithReserve ?? medicine.total;
    const days = medicine.deliveryDays || medicine.treatmentDays || 0;
    const baseText = medicine.packageADetail && medicine.packageADetail.includes('(uso real:') ? ` (uso real: ${medicine.packageADetail.split('(uso real: ')[1].replace(')', '')})` : '';
    return `Insulina: ${total} UI por ${days} dia(s)${baseText}`;
  }
  const type = medicine.mode === 'ml' ? 'Líquido' : 'Comprimido';
  const unit = medicine.mode === 'ml' ? 'mL' : 'comprimido(s)';
  const freq = medicine.weekly ? `${medicine.weeklyDoses}x/${medicine.deliveryDays || medicine.treatmentDays || 0} dias` : `de ${medicine.intervalHours} em ${medicine.intervalHours} horas`;
  const stock = medicine.stockDurationDays ? ` · estoque: ${roundUp(medicine.stockDurationDays)} dia(s)` : '';
  return `${type}: ${medicine.totalWithReserve} ${unit} por ${medicine.deliveryDays} dia(s), ${medicine.dose} ${medicine.mode === 'ml' ? 'mL' : 'comp.'} ${freq}${stock}`;
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

  const weekly = form.weekly === '1';

  const isMl = form.mode === 'ml';
  const isInsulin = form.mode === 'insulina';
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId) || recipes.at(-1) || null;

  const result = useMemo(() => {
    if (form.mode === 'insulina') {
      const totalUi = positiveNumber(form.insulinMorning) + positiveNumber(form.insulinAfternoon) + positiveNumber(form.insulinNight) + positiveNumber(form.insulinLunch) + positiveNumber(form.insulinDinner);
      const divisor = form.insulinMode === 'tubete' ? 300 : 1000;
      const days = positiveNumber(form.insulinDays);
      const base = totalUi * days / divisor;
      const deliveredTotal = totalUi > 0 && divisor > 0 ? (base % 1 === 0 ? base + 1 : Math.ceil(base)) : 0;
      return {
        deliveryDays: days,
        dosesPerDay: 0,
        total: deliveredTotal,
        totalWithReserve: deliveredTotal,
        deliveredTotal,
        primaryLabel: form.insulinMode === 'tubete' ? 'Tubetes a entregar' : 'Frascos a entregar',
        packageA: deliveredTotal,
        packageALabel: form.insulinMode === 'tubete' ? 'tubete(s)' : 'frasco(s)',
        packageADetail: divisor === 300 ? `Dividido por 300 UI (uso real: ${base})` : `Dividido por 1000 UI (uso real: ${base})`,
        warning: '',
      };
    }

    const dose = positiveNumber(form.dose);
    const intervalHours = positiveNumber(form.intervalHours);
    const treatmentDays = positiveNumber(form.treatmentDays);
    const requestedDays = positiveNumber(form.deliveryDays);
    const deliveryDays = Math.min(requestedDays || treatmentDays, treatmentDays || requestedDays);
    const dosesPerDay = intervalHours > 0 ? 24 / intervalHours : 0;
    const totalDoseUnits = weekly ? Math.ceil(deliveryDays / 7) * dose : dose * dosesPerDay * deliveryDays;
    const totalWithReserve = totalDoseUnits;

    if (form.mode === 'ml') {
      const mlPerBottle = positiveNumber(form.mlPerBottle);
      const bottles = mlPerBottle > 0 ? Math.ceil(totalWithReserve / mlPerBottle) : 0;
      const deliveredTotal = mlPerBottle > 0 ? bottles * mlPerBottle : totalWithReserve;
      return {
        deliveryDays,
        dosesPerDay,
        total: roundUp(totalDoseUnits),
        totalWithReserve: roundUp(totalWithReserve),
        deliveredTotal,
        primaryLabel: 'mL a entregar',
        packageA: bottles,
        packageALabel: 'frasco(s)',
        packageADetail: mlPerBottle ? `${mlPerBottle} mL por frasco` : 'Informe o volume do frasco',
        warning: requestedDays > treatmentDays ? 'O período de entrega foi limitado à duração do tratamento.' : '',
        stockDurationDays: deliveredTotal > 0 && dosesPerDay > 0 ? deliveredTotal / totalWithReserve * deliveryDays : 0,
      };
    }

    const unitsPerBlister = positiveNumber(form.unitsPerBlister);
    const blistersPerBox = positiveNumber(form.blistersPerBox);
    const unitsPerBox = unitsPerBlister * blistersPerBox;
    const blisters = unitsPerBlister > 0 ? Math.ceil(totalWithReserve / unitsPerBlister) : 0;
    const boxes = unitsPerBox > 0 ? Math.ceil(totalWithReserve / unitsPerBox) : 0;

    const deliveredTotal = unitsPerBlister > 0 ? blisters * unitsPerBlister : totalWithReserve;
    return {
      deliveryDays,
      dosesPerDay,
      total: roundUp(totalDoseUnits),
      totalWithReserve: roundUp(totalWithReserve),
      deliveredTotal,
      primaryLabel: 'comprimido(s) a entregar',
      packageA: blisters,
      packageALabel: 'cartela(s)',
      packageADetail: unitsPerBlister ? `${unitsPerBlister} comprimidos por cartela` : 'Informe a cartela',
      packageB: boxes,
      packageBLabel: 'caixa(s)',
      packageBDetail: unitsPerBox ? `${unitsPerBox} comprimidos por caixa` : 'Informe cartelas por caixa',
      warning: requestedDays > treatmentDays ? 'O período de entrega foi limitado à duração do tratamento.' : '',
      stockDurationDays: deliveredTotal > 0 && dosesPerDay > 0 ? deliveredTotal / (dose * dosesPerDay) : 0,
    };
  }, [form, weekly]);

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
        insulinDays: positiveNumber(form.insulinDays),
        packageBLabel: '',
        packageB: 0,
      };
    }

    const name = nextName('Remédio', currentMedicines.length);
    const medicine = {
      ...base,
      name,
      dose: positiveNumber(form.dose),
      intervalHours: positiveNumber(form.intervalHours),
      treatmentDays: positiveNumber(form.treatmentDays),
      deliveryDays: result.deliveryDays,
      reservePercent: positiveNumber(form.reservePercent),
      weekly,
      weeklyDoses: weekly ? 1 : 0,
      stockDurationDays: result.stockDurationDays || 0,
    };

    if (form.mode === 'ml') {
      medicine.mlPerBottle = positiveNumber(form.mlPerBottle);
    } else {
      medicine.unitsPerBlister = positiveNumber(form.unitsPerBlister);
      medicine.blistersPerBox = positiveNumber(form.blistersPerBox);
    }

    return medicine;
  };

  const addMedicine = () => {
    setCurrentMedicines((items) => [...items, buildMedicine()]);
    setForm((prev) => ({ ...prev, ...resetPackagingFields() }));
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
    setForm((prev) => ({ ...initialForm, ...resetPackagingFields(), mode: prev.mode }));
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
            <button className={!isMl && !isInsulin ? 'active' : ''} onClick={() => setForm((prev) => ({ ...prev, mode: 'comprimidos' }))}>
              <Pill size={18} /> Comprimidos
            </button>
            <button className={isMl ? 'active' : ''} onClick={() => setForm((prev) => ({ ...prev, mode: 'ml' }))}>
              <Droplets size={18} /> Líquidos / mL
            </button>
            <button className={isInsulin ? 'active' : ''} onClick={() => setForm((prev) => ({ ...prev, mode: 'insulina' }))}>
              <Syringe size={18} /> Insulinas
            </button>
          </div>

          <div className="grid">
            <Field label={isMl ? 'Volume por dose' : 'Comprimidos por dose'} value={form.dose} onChange={setValue('dose')} suffix={isMl ? 'mL' : 'comp.'} />
            <label className="field checkboxField">
              <span>Tomar semanalmente</span>
              <div className="checkWrap">
                <input type="checkbox" checked={form.weekly === '1'} onChange={(e) => setValue('weekly')(e.target.checked ? '1' : '0')} />
                <strong>Semanal</strong>
              </div>
            </label>
            <Field label="Intervalo entre doses" value={form.intervalHours} onChange={setValue('intervalHours')} suffix="horas" help="Ex.: de 8 em 8 horas = 8" disabled={form.weekly === '1'} />
            <Field label="Duração do tratamento" value={form.treatmentDays} onChange={setValue('treatmentDays')} suffix="dias" />
            <Field label="Entregar para" value={form.deliveryDays} onChange={setValue('deliveryDays')} suffix="dias" help="Igual ao tratamento por padrão. Altere se a entrega for parcial ou em período diferente." />
            <Field label="Reserva técnica" value={form.reservePercent} onChange={setValue('reservePercent')} suffix="%" help="Acréscimo de segurança contra perdas, avarias ou extravio. Ex.: 10% garante 10 unidades extras a cada 100 calculadas." />

            {isMl ? (
              <Field label="Volume por frasco" value={form.mlPerBottle} onChange={setValue('mlPerBottle')} suffix="mL" />
            ) : isInsulin ? (
              <>
                <Field label="Modo de insulina" value={form.insulinMode} onChange={setValue('insulinMode')} suffix={form.insulinMode === 'tubete' ? 'tubete' : 'frasco'} help="300 UI por tubete, 1000 UI por frasco" />
                <label className="field checkboxField">
                  <span>Manhã</span>
                  <div className="checkWrap">
                    <input type="number" value={form.insulinMorning} onChange={setValue('insulinMorning')} min="0" step="any" />
                    <strong>UI</strong>
                  </div>
                </label>
                <label className="field checkboxField">
                  <span>Tarde</span>
                  <div className="checkWrap">
                    <input type="number" value={form.insulinAfternoon} onChange={setValue('insulinAfternoon')} min="0" step="any" />
                    <strong>UI</strong>
                  </div>
                </label>
                <label className="field checkboxField">
                  <span>Noite</span>
                  <div className="checkWrap">
                    <input type="number" value={form.insulinNight} onChange={setValue('insulinNight')} min="0" step="any" />
                    <strong>UI</strong>
                  </div>
                </label>
              </>
            ) : (
              <>
                <Field label="Comprimidos por cartela" value={form.unitsPerBlister} onChange={setValue('unitsPerBlister')} suffix="comp." />
                <Field label="Cartelas por caixa" value={form.blistersPerBox} onChange={setValue('blistersPerBox')} suffix="cart." />
              </>
            )}
            {isInsulin && (
              <Field label="Dias de tratamento" value={form.insulinDays} onChange={setValue('insulinDays')} suffix="dias" help="Período padrão de 30 dias." />
            )}
          </div>

          <div className="actions">
            <button className="secondaryAction" onClick={addMedicine}><Plus size={18} /> Adicionar medicamento</button>
            <button className="primaryAction" onClick={startNewRecipe}><Save size={18} /> Nova receita</button>
          </div>
        </section>

        <section className="results" aria-live="polite">
          {weekly ? (
            <ResultCard title="Frequência" value={`${form.dose} ${isMl ? 'mL' : 'comp.'}/semana`} detail={`${result.deliveryDays} dia(s)`} />
          ) : (
            <ResultCard title="Frequência diária" value={`${roundUp(result.dosesPerDay)} dose(s)/dia`} detail={`Entrega calculada para ${result.deliveryDays} dia(s)`} />
          )}
          {isInsulin ? (
            <ResultCard title={result.primaryLabel} value={result.deliveredTotal} detail={result.packageADetail} />
          ) : (
            <>
              <ResultCard title={result.primaryLabel} value={result.totalWithReserve} detail={positiveNumber(form.reservePercent) ? `${result.total} sem reserva` : 'Sem reserva técnica'} />
              <ResultCard title={result.packageALabel} value={result.packageA} detail={result.packageADetail} />
              {!isMl && <ResultCard title={result.packageBLabel} value={result.packageB} detail={result.packageBDetail} />}
            </>
          )}
        </section>

        {result.warning && <p className="warning">Atenção: {result.warning}</p>}

        <section className="formula">
          <PackageCheck size={20} />
          <p>Fórmula: quantidade = dose × (24 ÷ intervalo em horas) × dias de entrega. Embalagens são sempre arredondadas para cima.</p>
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
