import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSettings, updateSettings } from '../firebase/dbService';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSettings();
        setSettings(data);
      } catch (err) {
        toast.error('Error al cargar configuración: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let parsedValue = value;
    if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    }
    
    if (name.startsWith('bank.')) {
      const field = name.split('.')[1];
      setSettings(s => ({
        ...s,
        bankAccount: { ...s.bankAccount, [field]: parsedValue }
      }));
    } else if (name.startsWith('email.')) {
      const field = name.split('.')[1];
      setSettings(s => ({
        ...s,
        emailMessages: { ...s.emailMessages, [field]: parsedValue }
      }));
    } else {
      setSettings(s => ({ ...s, [name]: parsedValue }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(settings, currentUser.email);
      toast.success('Configuración global actualizada correctamente');
    } catch (err) {
      toast.error('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-state">Cargando configuración...</div>;
  if (!settings) return <div className="loading-state">Error: No se pudo cargar la configuración.</div>;

  return (
    <div className="admin-section">
      <div className="admin-header">
        <h2>⚙️ Configuración Global</h2>
        <p className="admin-subtitle">Ajusta reglas de negocio y correos automáticos.</p>
      </div>

      <form onSubmit={handleSave} className="settings-form">
        <div className="settings-grid">
          {/* Reglas de Negocio */}
          <div className="settings-card">
            <h3>Reglas de Negocio</h3>
            <div className="form-group">
              <label>Precio por Hora (CLP)</label>
              <input type="number" name="pricePerHour" value={settings.pricePerHour} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Porcentaje de Abono (%)</label>
              <input type="number" name="depositPercentage" value={settings.depositPercentage} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Días máximos a futuro permitidos</label>
              <input type="number" name="maxDaysAhead" value={settings.maxDaysAhead} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Horas continuas máximas por reserva</label>
              <input type="number" name="maxHoursPerDay" value={settings.maxHoursPerDay} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Plazo mínimo cancelación (horas antes)</label>
              <input type="number" name="cancelDeadlineHours" value={settings.cancelDeadlineHours} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Tiempo para liberar sin abono (horas)</label>
              <input type="number" name="autoReleaseHours" value={settings.autoReleaseHours} onChange={handleChange} required />
            </div>
          </div>

          {/* Datos Bancarios */}
          <div className="settings-card">
            <h3>Datos Bancarios (Para Correos)</h3>
            <div className="form-group">
              <label>Titular de la cuenta</label>
              <input type="text" name="bank.name" value={settings.bankAccount.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>RUT</label>
              <input type="text" name="bank.rut" value={settings.bankAccount.rut} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Banco</label>
              <input type="text" name="bank.bank" value={settings.bankAccount.bank} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Tipo de Cuenta</label>
              <input type="text" name="bank.type" value={settings.bankAccount.type} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Número de Cuenta</label>
              <input type="text" name="bank.account" value={settings.bankAccount.account} onChange={handleChange} required />
            </div>
          </div>

          {/* Textos de Correos */}
          <div className="settings-card" style={{ gridColumn: '1 / -1' }}>
            <h3>Textos de Correos y Contacto</h3>
            <div className="form-group">
              <label>Número de WhatsApp (con código de país, ej. 56912345678)</label>
              <input type="text" name="whatsappNumber" value={settings.whatsappNumber || ''} onChange={handleChange} required />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#e3b341' }}>Correo: Reserva Pendiente (Cobro)</h4>
                <div className="form-group">
                  <label>Texto Introductorio</label>
                  <textarea name="email.pendingIntro" value={settings.emailMessages?.pendingIntro || ''} onChange={handleChange} rows="3" required />
                </div>
                <div className="form-group">
                  <label>Texto Cierre / Instrucciones</label>
                  <textarea name="email.pendingOutro" value={settings.emailMessages?.pendingOutro || ''} onChange={handleChange} rows="3" required />
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#3fb950' }}>Correo: Reserva Confirmada</h4>
                <div className="form-group">
                  <label>Texto Introductorio</label>
                  <textarea name="email.confirmedIntro" value={settings.emailMessages?.confirmedIntro || ''} onChange={handleChange} rows="3" required />
                </div>
                <div className="form-group">
                  <label>Texto Cierre / Instrucciones</label>
                  <textarea name="email.confirmedOutro" value={settings.emailMessages?.confirmedOutro || ''} onChange={handleChange} rows="3" required />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-actions">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
