import React from 'react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';
import { Clock, TrendingUp, Calendar, Users, DollarSign, Activity } from 'lucide-react';

const noShowData = [
  { name: 'Asistencia', value: 88, color: 'var(--green)' }, 
  { name: 'Cancelación', value: 12, color: 'var(--red)' }  
];

const peakHoursData = [
  { day: 'Lun', visitors: 20 },
  { day: 'Mar', visitors: 25 },
  { day: 'Mié', visitors: 30 },
  { day: 'Jue', visitors: 45 },
  { day: 'Vie 19:00', visitors: 85 },
  { day: 'Sáb 18:00', visitors: 95 },
  { day: 'Dom', visitors: 50 },
];

const ltvData = [
  { month: 'Ene', value: 50000 },
  { month: 'Feb', value: 75000 },
  { month: 'Mar', value: 100000 },
  { month: 'Abr', value: 125000 },
  { month: 'May', value: 140000 },
  { month: 'Jun', value: 150000 },
];

export default function MetricsDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header / Welcome Card Style */}
      <div className="welcome-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: 0 }}>
        <div>
          <h2 style={{ color: 'var(--accent-light)' }}>Métricas Avanzadas</h2>
          <p>Vista General de Rendimiento — ElRanchoStudio</p>
        </div>
        <div style={{ 
          background: 'var(--green-glow)', 
          color: 'var(--green)', 
          padding: '0.6rem 1.2rem', 
          borderRadius: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          border: '1px solid var(--green)',
          fontWeight: '700',
          fontSize: '0.9rem'
        }}>
          <Activity size={18} />
          <span>Estado Saludable</span>
        </div>
      </div>

      {/* Top KPI Cards usando admin-grid */}
      <div className="admin-grid">
        {/* Card 1 */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--text-secondary)' }}>Tiempo Medio Confirmación</h3>
            <div style={{ background: 'var(--accent-glow)', padding: '0.6rem', borderRadius: '12px' }}>
              <Clock color="var(--accent)" size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '0.8rem 0 0.4rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1' }}>4.5</span>
            <span style={{ color: 'var(--text-secondary)' }}>horas</span>
          </div>
          <p style={{ color: 'var(--green)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
            <TrendingUp size={14} /> -15% mejora mensual
          </p>
        </div>

        {/* Card 2 */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--text-secondary)' }}>Conversión Landing Page</h3>
            <div style={{ background: 'var(--yellow-glow)', padding: '0.6rem', borderRadius: '12px' }}>
              <Users color="var(--yellow)" size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '0.8rem 0 0.4rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: '1' }}>18%</span>
          </div>
          <div style={{ width: '100%', background: 'var(--bg-base)', borderRadius: '10px', height: '6px', overflow: 'hidden', marginTop: '6px' }}>
            <div style={{ background: 'var(--yellow)', height: '100%', width: '18%', borderRadius: '10px' }}></div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.8rem' }}>
            Visitas a reservas completadas
          </p>
        </div>

        {/* Card 3 */}
        <div className="admin-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--text-secondary)' }}>LTV Promedio Anual</h3>
            <div style={{ background: 'var(--green-glow)', padding: '0.6rem', borderRadius: '12px' }}>
              <DollarSign color="var(--green)" size={20} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '0.8rem 0 0.4rem' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--green)', lineHeight: '1' }}>$150k</span>
            <span style={{ color: 'var(--text-secondary)' }}>CLP</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Ingreso proyectado por banda frecuente
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Donut Chart */}
        <div className="admin-card" style={{ padding: '2rem 1.5rem' }}>
          <h3 style={{ color: 'var(--accent-light)' }}>Tasa de Cancelación (No-Show)</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Asistencia vs cancelación de reservas</p>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={noShowData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {noShowData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  formatter={(value) => [`${value}%`, 'Porcentaje']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green-glow)' }}></div>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Asistencia (88%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 8px var(--red-glow)' }}></div>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cancelación (12%)</span>
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="admin-card" style={{ padding: '2rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ color: 'var(--accent-light)' }}>Distribución de Horarios Punta</h3>
            <Calendar color="var(--text-secondary)" size={20} />
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Demanda de bloques por día/hora</p>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  cursor={{fill: 'var(--bg-elevated)'}}
                  contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)' }}
                />
                <Bar dataKey="visitors" radius={[6, 6, 0, 0]} name="Reservas">
                  {
                    peakHoursData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.visitors > 80 ? 'var(--accent)' : 'var(--border)'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart */}
        <div className="admin-card" style={{ gridColumn: '1 / -1', padding: '2rem 1.5rem' }}>
          <h3 style={{ color: 'var(--accent-light)' }}>Valor de Ciclo de Vida del Cliente (LTV)</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Proyección de ingresos acumulados por banda frecuente a lo largo del año</p>
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ltvData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={15} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-primary)' }}
                  formatter={(value) => [`$${value.toLocaleString('es-CL')} CLP`, 'LTV Proyectado']}
                  labelStyle={{ color: 'var(--text-secondary)', marginBottom: '8px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="var(--accent)" 
                  strokeWidth={4}
                  dot={{ fill: 'var(--bg-surface)', stroke: 'var(--accent)', strokeWidth: 3, r: 6 }}
                  activeDot={{ r: 8, fill: 'var(--accent)', stroke: '#fff', strokeWidth: 2 }}
                  name="LTV Promedio"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
