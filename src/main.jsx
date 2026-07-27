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
  expiresAt: '',
};

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
    return `Insulina: ${total} UI por ${days} dia(s)`;
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
  const [view, setView] = useState('calculator');

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
      const deliveredTotal = totalUi > 0 && divisor > 0 ? Math.ceil(totalUi * days / divisor) : 0;
      return {
        deliveryDays: days,
        dosesPerDay: 0,
        total: deliveredTotal,
        totalWithReserve: deliveredTotal,
        deliveredTotal,
        primaryLabel: form.insulinMode === 'tubete' ? 'Tubetes a entregar' : 'Frascos a entregar',
        packageA: deliveredTotal,
        packageALabel: form.insulinMode === 'tubete' ? 'tubete(s)' : 'frasco(s)',
        packageADetail: divisor === 300 ? 'Dividido por 300 UI' : 'Dividido por 1000 UI',
        warning: '',
      };
    }

    const dose = positiveNumber(form.dose);
    const intervalHours = positiveNumber(form.intervalHours);
    const treatmentDays = positiveNumber(form.treatmentDays);
    const requestedDays = positiveNumber(form.deliveryDays);
    const deliveryDays = Math.min(requestedDays || treatmentDays, treatmentDays || requestedDays);
    let weeklyDoses = 0;
    if (weekly) {
      const today = new Date();
      const startDay = today.getDay();
      for (let i = 0; i < Math.max(deliveryDays, 0); i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        if (d.getDay() === startDay) weeklyDoses++;
      }
    }
    const dosesPerDay = weekly ? weeklyDoses / 7 : (intervalHours > 0 ? 24 / intervalHours : 0);
    const totalDoseUnits = weekly ? weeklyDoses * dose : dose * dosesPerDay * deliveryDays;
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
        weeklyDoses,
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
      weeklyDoses,
      stockDurationDays: deliveredTotal > 0 && dosesPerDay > 0 ? deliveredTotal / (dose * dosesPerDay) : 0,
    };
  }, [form]);

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
        deliveryDays: result.deliveryDays,
      };
    }
    return {
      ...base,
      name: nextName('Remédio', currentMedicines.length),
      dose: positiveNumber(form.dose),
      intervalHours: positiveNumber(form.intervalHours),
      treatmentDays: positiveNumber(form.treatmentDays),
      deliveryDays: result.deliveryDays,
      weekly,
      weeklyDoses: result.weeklyDoses,
      stockDurationDays: result.stockDurationDays,
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
      expiresAt: form.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
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
            <button className={!isMl && !isInsulin && view === 'calculator' ? 'active' : ''} onClick={() => setView('calculator')}>
              <Calculator size={18} /> Calculadora
            </button>
            <button className={view === 'expiration' ? 'active' : ''} onClick={() => setView('expiration')}>
              <ClipboardList size={18} /> Vencimento de receitas
            </button>
          </div>

          {view === 'calculator' && (
            <div className="grid">
              {isInsulin ? (
                <>
                  <div className="field">
                    <span>Apresentação</span>
                    <div className="radio">
                      <label><input type="radio" name="insulinMode" value="tubete" checked={form.insulinMode === 'tubete'} onChange={() => setValue('insulinMode')('tubete')} /> Tubete</label>
                      <label><input type="radio" name="insulinMode" value="frasco" checked={form.insulinMode === 'frasco'} onChange={() => setValue('insulinMode')('frasco')} /> Frasco</label>
                    </div>
                  </div>
                  <Field label="Manhã" value={form.insulinMorning} onChange={setValue('insulinMorning')} suffix="UI" min="0" step="any" />
                  <Field label="Almoço" value={form.insulinLunch} onChange={setValue('insulinLunch')} suffix="UI" min="0" step="any" />
                  <Field label="Tarde" value={form.insulinAfternoon} onChange={setValue('insulinAfternoon')} suffix="UI" min="0" step="any" />
                  <Field label="Jantar" value={form.insulinDinner} onChange={setValue('insulinDinner')} suffix="UI" min="0" step="any" />
                  <Field label="Noite" value={form.insulinNight} onChange={setValue('insulinNight')} suffix="UI" min="0" step="any" />
                  <Field label="Dias de tratamento" value={form.insulinDays} onChange={setValue('insulinDays')} suffix="dias" />
                </>
              ) : (
                <>
                  <Field label={isMl ? 'Volume por dose' : 'Comprimidos por dose'} value={form.dose} onChange={setValue('dose')} suffix={isMl ? 'mL' : 'comp.'} />
                  <Field
                    label="Intervalo entre doses"
                    value={form.intervalHours}
                    onChange={setValue('intervalHours')}
                    suffix="horas"
                    help={
                      <span className="helpInline">
                        <span>Ex.: de 8 em 8 horas = 8</span>
                        {!isMl && (
                          <label className="inlineCheckbox">
                            <input type="checkbox" checked={form.weekly === '1'} onChange={(e) => setValue('weekly')(e.target.checked ? '1' : '0')} />
                            <strong>Semanal</strong>
                          </label>
                        )}
                      </span>
                    }
                    disabled={form.weekly === '1'}
                  />
                  <Field label="Duração do tratamento" value={form.treatmentDays} onChange={setValue('treatmentDays')} suffix="dias" />
                  <Field label="Entregar para" value={form.deliveryDays} onChange={setValue('deliveryDays')} suffix="dias" help="Igual ao tratamento por padrão. Altere se a entrega for parcial ou em período diferente." />
                  {!isInsulin && <Field label="Validade da receita" value={form.expiresAt} onChange={setValue('expiresAt')} suffix="" help="Data em que esta receita vence. Use para controle de dispensação." />}

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
          )}

          <div className="grid">
            {isInsulin ? (
              <>
                <div className="field">
                  <span>Apresentação</span>
                  <div className="radio">
                    <label><input type="radio" name="insulinMode" value="tubete" checked={form.insulinMode === 'tubete'} onChange={() => setValue('insulinMode')('tubete')} /> Tubete</label>
                    <label><input type="radio" name="insulinMode" value="frasco" checked={form.insulinMode === 'frasco'} onChange={() => setValue('insulinMode')('frasco')} /> Frasco</label>
                  </div>
                </div>
                <Field label="Manhã" value={form.insulinMorning} onChange={setValue('insulinMorning')} suffix="UI" min="0" step="any" />
                <Field label="Almoço" value={form.insulinLunch} onChange={setValue('insulinLunch')} suffix="UI" min="0" step="any" />
                <Field label="Tarde" value={form.insulinAfternoon} onChange={setValue('insulinAfternoon')} suffix="UI" min="0" step="any" />
                <Field label="Jantar" value={form.insulinDinner} onChange={setValue('insulinDinner')} suffix="UI" min="0" step="any" />
                <Field label="Noite" value={form.insulinNight} onChange={setValue('insulinNight')} suffix="UI" min="0" step="any" />
                <Field label="Dias de tratamento" value={form.insulinDays} onChange={setValue('insulinDays')} suffix="dias" />
              </>
            ) : (
              <>
                <Field label={isMl ? 'Volume por dose' : 'Comprimidos por dose'} value={form.dose} onChange={setValue('dose')} suffix={isMl ? 'mL' : 'comp.'} />
                <Field
                  label="Intervalo entre doses"
                  value={form.intervalHours}
                  onChange={setValue('intervalHours')}
                  suffix="horas"
                  help={
                    <span className="helpInline">
                      <span>Ex.: de 8 em 8 horas = 8</span>
                      {!isMl && (
                        <label className="inlineCheckbox">
                          <input type="checkbox" checked={form.weekly === '1'} onChange={(e) => setValue('weekly')(e.target.checked ? '1' : '0')} />
                          <strong>Semanal</strong>
                        </label>
                      )}
                    </span>
                  }
                  disabled={form.weekly === '1'}
                />
                <Field label="Duração do tratamento" value={form.treatmentDays} onChange={setValue('treatmentDays')} suffix="dias" />
                <Field label="Entregar para" value={form.deliveryDays} onChange={setValue('deliveryDays')} suffix="dias" help="Igual ao tratamento por padrão. Altere se a entrega for parcial ou em período diferente." />
                {!isInsulin && <Field label="Validade da receita" value={form.expiresAt} onChange={setValue('expiresAt')} suffix="" help="Data em que esta receita vence. Use para controle de dispensação." />}

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
            <ResultCard title={result.primaryLabel} value={result.totalWithReserve} detail={result.packageADetail} />
          ) : (
            <>
              {weekly ? (
                <ResultCard title="Frequência" value={`${result.weeklyDoses}x/${result.deliveryDays} dias`} detail={`${form.dose} ${isMl ? 'mL' : 'comp.'} por semana`} />
              ) : (
                <ResultCard title="Frequência diária" value={`${roundUp(result.dosesPerDay)} dose(s)/dia`} detail={`Entrega calculada para ${result.deliveryDays} dia(s)`} />
              )}
              <ResultCard title={result.primaryLabel} value={result.totalWithReserve} detail="Sem reserva técnica" />
              <ResultCard title="Duração do estoque" value={`${roundUp(result.stockDurationDays)} dia(s)`} detail="Baseado na quantidade entregue" />
              <ResultCard title={result.packageALabel} value={result.packageA} detail={result.packageADetail} />
              {!isMl && <ResultCard title={result.packageBLabel} value={result.packageB} detail={result.packageBDetail} />}
            </>
          )}
        </section>

        {result.warning && <p className="warning">Atenção: {result.warning}</p>}

        {view === 'calculator' && (
          <section className="formula">
            <PackageCheck size={20} />
            <p>
              {form.mode === 'insulina'
                ? 'Fórmula: insulina = (soma das doses UI) × dias de tratamento ÷ divisor da apresentação.'
                : 'Fórmula: quantidade = dose × (24 ÷ intervalo em horas) × dias de entrega. Embalagens são sempre arredondadas para cima.'}
            </p>
          </section>
        )}

        {view === 'expiration' && (
          <section className="panel" aria-label="Validação de vencimento de receitas">
            <div className="panelTitle">
              <ClipboardList size={20} />
              <strong>Vencimento de receitas</strong>
            </div>
            {recipes.length === 0 && <p className="emptyText">Nenhuma receita arquivada.</p>}
            <div className="recipeList">
              {recipes.map((recipe) => {
                const today = new Date();
                const expires = new Date(recipe.expiresAt || '');
                const diffMs = expires - new Date(today.toISOString().slice(0, 10));
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                const status = isNaN(diffDays) || diffDays < 0 ? 'Vencida' : diffDays <= 7 ? 'Vence em breve' : 'Válida';
                const statusColor = status === 'Vencida' ? '#b91c1c' : status === 'Vence em breve' ? '#b45309' : '#15803d';
                return (
                  <article key={recipe.id} className="medicineItem">
                    <h3>{recipe.name}</h3>
                    <p>Criada em: {recipe.createdAt}</p>
                    <p>Vencimento: {recipe.expiresAt ? new Date(recipe.expiresAt).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                    <p style={{ color: statusColor, fontWeight: 800 }}>{status}{diffDays >= 0 ? ` (${diffDays} dia(s))` : ''}</p>
                    <small>{recipe.medicines.length} remédio(s)</small>
                  </article>
                );
              })}
            </div>
          </section>
        )}

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
