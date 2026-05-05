import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Globe, Lock } from 'lucide-react';
import workoutsService from '../../services/workouts.service';
import { IntensityLevel } from '../../types';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import {
  ALL_INTENSITIES, INTENSITY_LABELS, INTENSITY_COLORS,
} from '../../lib/muscles';
import { toast } from '../../components/ui/Toast';

/**
 * Edición simple de la cabecera del entrenamiento (título, notas, intensidad, fecha,
 * privacidad). Para reorganizar ejercicios o series, el usuario puede borrar y volver
 * a crear el entrenamiento usando "Nuevo entrenamiento".
 */
export default function EditWorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    title: '',
    notes: '',
    durationMin: 60,
    intensity: 'HIGH' as IntensityLevel,
    isPublic: true,
    workoutDate: '',
  });

  useEffect(() => {
    if (!id) return;
    workoutsService
      .getById(id)
      .then((w) => {
        setForm({
          title: w.title,
          notes: w.notes ?? '',
          durationMin: w.durationMin,
          intensity: w.intensity,
          isPublic: w.isPublic,
          workoutDate: new Date(w.workoutDate).toISOString().slice(0, 16),
        });
      })
      .catch(() => toast.error('Error', 'No se pudo cargar'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setSubmitting(true);
    try {
      await workoutsService.update(id, {
        title: form.title.trim(),
        notes: form.notes ? form.notes.trim() : null,
        durationMin: Number(form.durationMin),
        intensity: form.intensity,
        isPublic: form.isPublic,
        workoutDate: form.workoutDate ? new Date(form.workoutDate).toISOString() : undefined,
      });
      toast.success('Actualizado');
      navigate(`/workouts/${id}`);
    } catch (err: unknown) {
      console.error('[EditWorkout] error:', err);
      const e = err as {
        response?: { data?: { error?: string; message?: string } };
        message?: string;
      };
      const backendMsg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Error al guardar los cambios';
      toast.error('No se pudo guardar', backendMsg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Spinner fullScreen label="Cargando..." />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="text-surface-600 hover:text-surface-900 text-sm font-medium inline-flex items-center gap-1 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">Editar entrenamiento</h1>
        <p className="text-surface-600 mt-1 text-sm">
          Edita los datos generales. Para modificar ejercicios o series, crea un nuevo entrenamiento.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-white border border-surface-200 rounded-2xl p-5 space-y-4 shadow-soft">
          <div>
            <label className="label">Título</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea
              rows={3}
              maxLength={2000}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-field resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Duración (min)</label>
              <input
                type="number"
                required
                min={1}
                max={1440}
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Fecha y hora</label>
              <input
                type="datetime-local"
                value={form.workoutDate}
                onChange={(e) => setForm({ ...form, workoutDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div>
            <label className="label">Intensidad</label>
            <div className="grid grid-cols-4 gap-2">
              {ALL_INTENSITIES.map((i) => {
                const c = INTENSITY_COLORS[i];
                const active = form.intensity === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm({ ...form, intensity: i })}
                    className={`p-3 rounded-lg border text-sm font-semibold transition-all
                                ${active ? `${c.bg} border-current ${c.text}` : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'}`}
                  >
                    {INTENSITY_LABELS[i]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, isPublic: true })}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                          ${form.isPublic ? 'bg-brand-50 border-brand-300' : 'bg-white border-surface-200'}`}
            >
              <Globe className={`w-5 h-5 ${form.isPublic ? 'text-brand-600' : 'text-surface-400'}`} />
              <p className="text-sm font-semibold text-surface-900">Público</p>
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, isPublic: false })}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left
                          ${!form.isPublic ? 'bg-brand-50 border-brand-300' : 'bg-white border-surface-200'}`}
            >
              <Lock className={`w-5 h-5 ${!form.isPublic ? 'text-brand-600' : 'text-surface-400'}`} />
              <p className="text-sm font-semibold text-surface-900">Privado</p>
            </button>
          </div>
        </section>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" loading={submitting} leftIcon={<Save className="w-4 h-4" />}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
