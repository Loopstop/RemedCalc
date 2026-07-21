import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Calculator, Pill, Droplets, PackageCheck } from 'lucide-react';
import './styles.css';

const roundUp = (value) => Math.ceil((Number(value) || 0) * 1000) / 1000;
const positiveNumber = (value) => Math.max(Number(value) || 0, 0);

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

function App() {
  const [form, setForm] = useState({
    mode: 'comprimidos',
    dose: '1',
    intervalHours: '8',
    treatmentDays: '30',
    deliveryDays: '30',
    reservePercent: '0',
    unitsPerBlister: '10',
    blistersPerBox: '3',
    mlPerBottle: '100',
  });

  const setValue = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));

  const result = useMemo(() => {
    const dose = positiveNumber(form.dose);
    const intervalHours = positiveNumber(form.intervalHours);
    const treatmentDays = positiveNumber(form.treatmentDays);
    const requestedDays = positiveNumber(form.deliveryDays);
    const deliveryDays = Math.min(requestedDays || treatmentDays, treatmentDays || requestedDays);
    const reserveFactor = 1 + positiveNumber(form.reservePercent) / 100;
    const dosesPerDay = intervalHours > 0 ? 24 / intervalHours : 0;
    const totalDoseUnits = dose * dosesPerDay * deliveryDays;
    const totalWithReserve = totalDoseUnits * reserveFactor;

    if (form.mode === 'ml') {
      const mlPerBottle = positiveNumber(form.mlPerBottle);
      const bottles = mlPerBottle > 0 ? Math.ceil(totalWithReserve / mlPerBottle) : 0;
      return {
        deliveryDays,
        dosesPerDay,
        total: roundUp(totalDoseUnits),
        totalWithReserve: roundUp(totalWithReserve),
        primaryLabel: 'mL a entregar',
        packageA: bottles,
        packageALabel: 'frasco(s)',
        packageADetail: mlPerBottle ? `${mlPerBottle} mL por frasco` : 'Informe o volume do frasco',
        warning: requestedDays > treatmentDays ? 'O período de entrega foi limitado à duração do tratamento.' : '',
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
      primaryLabel: 'comprimido(s) a entregar',
      packageA: blisters,
      packageALabel: 'cartela(s)',
      packageADetail: unitsPerBlister ? `${unitsPerBlister} comprimidos por cartela` : 'Informe a cartela',
      packageB: boxes,
      packageBLabel: 'caixa(s)',
      packageBDetail: unitsPerBox ? `${unitsPerBox} comprimidos por caixa` : 'Informe cartelas por caixa',
      warning: requestedDays > treatmentDays ? 'O período de entrega foi limitado à duração do tratamento.' : '',
    };
  }, [form]);

  const isMl = form.mode === 'ml';

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Farmácia · dispensação</p>
          <h1>RemedCalc</h1>
          <p>
            Calcule rapidamente quantidade a entregar por período, dose, intervalo e apresentação do medicamento.
          </p>
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
          <Field label={isMl ? 'Dose por tomada' : 'Comprimidos por tomada'} value={form.dose} onChange={setValue('dose')} suffix={isMl ? 'mL' : 'comp.'} />
          <Field label="Intervalo entre doses" value={form.intervalHours} onChange={setValue('intervalHours')} suffix="horas" help="Ex.: de 8 em 8 horas = 8" />
          <Field label="Duração do tratamento" value={form.treatmentDays} onChange={setValue('treatmentDays')} suffix="dias" />
          <Field label="Entregar para" value={form.deliveryDays} onChange={setValue('deliveryDays')} suffix="dias" help="Use para entrega parcial, mensal ou total." />
          <Field label="Reserva técnica" value={form.reservePercent} onChange={setValue('reservePercent')} suffix="%" help="Opcional: perdas, arredondamentos ou política interna." />

          {isMl ? (
            <Field label="Volume por frasco" value={form.mlPerBottle} onChange={setValue('mlPerBottle')} suffix="mL" />
          ) : (
            <>
              <Field label="Comprimidos por cartela" value={form.unitsPerBlister} onChange={setValue('unitsPerBlister')} suffix="comp." />
              <Field label="Cartelas por caixa" value={form.blistersPerBox} onChange={setValue('blistersPerBox')} suffix="cart." />
            </>
          )}
        </div>
      </section>

      <section className="results" aria-live="polite">
        <ResultCard title="Frequência diária" value={`${roundUp(result.dosesPerDay)} dose(s)/dia`} detail={`Entrega calculada para ${roundUp(result.deliveryDays)} dia(s)`} />
        <ResultCard title={result.primaryLabel} value={result.totalWithReserve} detail={positiveNumber(form.reservePercent) ? `${result.total} sem reserva` : 'Sem reserva técnica'} />
        <ResultCard title={result.packageALabel} value={result.packageA} detail={result.packageADetail} />
        {!isMl && <ResultCard title={result.packageBLabel} value={result.packageB} detail={result.packageBDetail} />}
      </section>

      {result.warning && <p className="warning">Atenção: {result.warning}</p>}

      <section className="formula">
        <PackageCheck size={20} />
        <p>
          Fórmula: quantidade = dose × (24 ÷ intervalo em horas) × dias de entrega. Embalagens são sempre arredondadas para cima.
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
