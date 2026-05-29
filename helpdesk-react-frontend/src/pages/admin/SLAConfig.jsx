import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { axiosInstance } from '../../api/axiosInstance';
import { useNotifications } from '../../context/NotificationContext';

const PRIORITY_COLORS = {
  URGENT: { text: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)' },
  HIGH: { text: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.2)' },
  MEDIUM: { text: '#eab308', bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.2)' },
  LOW: { text: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.2)' },
};

const SLAConfig = () => {
  const { addToast } = useNotifications();
  const queryClient = useQueryClient();
  const [editingPriority, setEditingPriority] = useState(null);

  // Fetch SLA Rules
  const { data: rules = [], isLoading, isError } = useQuery({
    queryKey: ['slaRules'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/sla');
      return res.data;
    }
  });

  // Update SLA Rule Mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedRule) => {
      const res = await axiosInstance.patch('/api/admin/sla', updatedRule);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['slaRules'] });
      addToast('SLA rule updated successfully!', 'Success', 'success');
      setEditingPriority(null);
    },
    onError: (err) => {
      const errMsg = err.response?.data?.message || 'Failed to update SLA rule.';
      addToast(errMsg, 'Error', 'error');
    }
  });

  // Form for inline editing
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const startEditing = (rule) => {
    setEditingPriority(rule.priority);
    reset({
      priority: rule.priority,
      responseHours: rule.responseHours,
      resolutionHours: rule.resolutionHours,
    });
  };

  const onSubmit = (formData) => {
    updateMutation.mutate({
      priority: formData.priority,
      responseHours: parseInt(formData.responseHours, 10),
      resolutionHours: parseInt(formData.resolutionHours, 10),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-on-surface-variant gap-3">
        <span className="material-symbols-outlined text-[32px] animate-spin text-primary">progress_activity</span>
        <p className="text-xs uppercase tracking-widest font-semibold opacity-75">Loading SLA configurations...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card p-8 flex flex-col items-center justify-center text-center gap-4 border border-rose-500/20 bg-rose-500/5">
        <span className="material-symbols-outlined text-rose-500 text-[40px] live-pulse">error</span>
        <div>
          <h3 className="text-sm font-bold text-rose-400">Failed to load SLA rules</h3>
          <p className="text-xs text-on-surface-variant mt-1">Please ensure the backend is connected and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 anim-fade-in">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-on-surface" style={{ fontFamily: 'var(--font-heading)' }}>
            Service Level Agreements (SLA)
          </h2>
          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
            Configure system-wide resolution thresholds for incoming customer requests. These rules dictate auto-escalation warnings and breach metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/20">
          <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Active Policy</span>
        </div>
      </div>

      {/* Grid of SLA Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => {
          const isEditing = editingPriority === rule.priority;
          const colors = PRIORITY_COLORS[rule.priority] || { text: 'var(--text-body)', bg: 'var(--bg-input)', border: 'var(--border-subtle)' };

          return (
            <div 
              key={rule.id} 
              className={`card p-5 relative overflow-hidden transition-all duration-300 ${
                isEditing ? 'ring-2 ring-primary border-transparent scale-[1.01]' : 'hover:border-outline-variant/60'
              }`}
            >
              {/* Card Accent Top Line */}
              <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: colors.text }} />

              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide border"
                    style={{ color: colors.text, backgroundColor: colors.bg, borderColor: colors.border }}
                  >
                    {rule.priority}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">Priority Rule</span>
                </div>

                {!isEditing && (
                  <button 
                    onClick={() => startEditing(rule)}
                    className="p-1.5 rounded-lg border border-outline-variant/30 bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:border-primary transition-all cursor-pointer"
                    title="Edit rules"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <input type="hidden" value={rule.priority} {...register('priority')} />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                        Response Time (Hrs)
                      </label>
                      <input 
                        type="number" 
                        min="1" 
                        max="720"
                        className="field w-full text-xs font-semibold py-2 px-3 bg-surface-container-high border-outline-variant focus:border-primary"
                        placeholder="Hours..."
                        {...register('responseHours', { 
                          required: 'Required', 
                          min: { value: 1, message: 'Min 1 hr' },
                          max: { value: 720, message: 'Max 720 hrs' }
                        })}
                      />
                      {errors.responseHours && (
                        <p className="text-[9px] text-rose-500 font-semibold mt-1">{errors.responseHours.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
                        Resolution Time (Hrs)
                      </label>
                      <input 
                        type="number" 
                        min="1" 
                        max="720"
                        className="field w-full text-xs font-semibold py-2 px-3 bg-surface-container-high border-outline-variant focus:border-primary"
                        placeholder="Hours..."
                        {...register('resolutionHours', { 
                          required: 'Required',
                          min: { value: 1, message: 'Min 1 hr' },
                          max: { value: 720, message: 'Max 720 hrs' }
                        })}
                      />
                      {errors.resolutionHours && (
                        <p className="text-[9px] text-rose-500 font-semibold mt-1">{errors.resolutionHours.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 justify-end">
                    <button 
                      type="button" 
                      onClick={() => setEditingPriority(null)}
                      className="btn hover:bg-surface-container text-on-surface-variant flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={updateMutation.isPending}
                      className="btn btn-primary flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          Save Rules
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 divide-x divide-outline-variant/20 bg-surface-container-lowest/50 rounded-xl p-3 border border-outline-variant/10">
                    <div className="pr-3">
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Response Target</p>
                      <p className="text-lg font-bold text-on-surface mt-1 tracking-tight">
                        {rule.responseHours} <span className="text-xs font-medium text-on-surface-variant">hours</span>
                      </p>
                    </div>
                    <div className="pl-4">
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Resolution Target</p>
                      <p className="text-lg font-bold text-on-surface mt-1 tracking-tight">
                        {rule.resolutionHours} <span className="text-xs font-medium text-on-surface-variant">hours</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-on-surface-variant/70 pt-1">
                    <span>Automatically checks for breaches every 15 minutes</span>
                    <span>Last updated: {new Date(rule.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Card / Best Practices */}
      <div className="card p-5 bg-primary/5 border border-primary/10 rounded-2xl flex items-start gap-4">
        <span className="material-symbols-outlined text-primary text-[22px] shrink-0 mt-0.5">info</span>
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-on-surface">SLA Configuration Best Practices</h4>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            SLA rules define the contract between support teams and users. Keep resolution targets challenging but achievable. If a ticket breaches the resolution threshold, a single escalation notification will be sent to all active administrators immediately, and the ticket status is highlighted on dashboards.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SLAConfig;
