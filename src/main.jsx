import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Calculator, ClipboardList, Droplets, PackageCheck, Pill, Plus, Save } from 'lucide-react';
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
  const type = medicine.mode === 'ml' ? 'Líquido' : 'Comprimido';
  const unit = medicine.mode === 'ml' ? 'mL' : 'comprimido(s)';
  const total = medicine.deliveredTotal ?? medicine.totalWithReserve ?? medicine.total;
  return `${type}: ${total} ${unit} por ${medicine.deliveryDays || medicine.treatmentDays || 0} dia(s), ${medicine.dose} ${medicine.mode === 'ml' ? 'mL' : 'comp.'} de ${medicine.intervalHours} em ${medicine.intervalHours} horas`;
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
    };
  }, [form]);

  const isMl = form.mode === 'ml';
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId) || recipes.at(-1) || null;

  const buildMedicine = () => ({
    id: crypto.randomUUID(),
    name: nextName('Remédio', currentMedicines.length),
    mode: form.mode,
    dose: positiveNumber(form.dose),
    intervalHours: positiveNumber(form.intervalHours),
    treatmentDays: positiveNumber(form.treatmentDays),
    total: result.total,
    totalWithReserve: result.totalWithReserve,
    deliveredTotal: result.deliveredTotal,
    packageALabel: result.packageALabel,
    packageA: result.packageA,
    packageBLabel: result.packageBLabel,
    packageB: result.packageB,
  });

  const addMedicine = () => {
    setCurrentMedicines((items) => [...items, buildMedicine()]);
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
            <button className={!isMl ? 'active' : ''} onClick={() => setValue('mode')('comprimidos')}>
              <Pill size={18} /> Comprimidos
            </button>
            <button className={isMl ? 'active' : ''} onClick={() => setValue('mode')('ml')}>
              <Droplets size={18} /> Líquidos / mL
            </button>
          </div>

          <div className="grid">
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
          </div>

          <div className="actions">
            <button className="secondaryAction" onClick={addMedicine}><Plus size={18} /> Adicionar medicamento</button>
            <button className="primaryAction" onClick={startNewRecipe}><Save size={18} /> Nova receita</button>
          </div>
        </section>

        <section className="results" aria-live="polite">
          <ResultCard title="Frequência diária" value={`${roundUp(result.dosesPerDay)} dose(s)/dia`} detail={`Entrega calculada para ${result.deliveryDays} dia(s)`} />
          <ResultCard title={result.primaryLabel} value={result.deliveredTotal} detail={`${result.total} calculado`} />
          <ResultCard title={result.packageALabel} value={result.packageA} detail={result.packageADetail} />
          {!isMl && <ResultCard title={result.packageBLabel} value={result.packageB} detail={result.packageBDetail} />}
        </section>

        <section className="formula">
          <PackageCheck size={20} />
          <p>Fórmula: quantidade = dose × (24 ÷ intervalo em horas) × dias de entrega. As embalagens são arredondadas para cima, então a quantidade entregue pode ser maior que o cálculo exato.</p>
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
