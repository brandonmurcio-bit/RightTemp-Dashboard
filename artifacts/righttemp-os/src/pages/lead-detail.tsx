import React, { useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { 
  useGetLead, 
  useUpdateLead, 
  useDeleteLead, 
  getGetLeadQueryKey,
  getGetLeadsQueryKey,
  getGetDashboardStatsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ChevronLeft, Save, Trash2, Calendar, Clock, MapPin, Building, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const leadUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().or(z.literal('')),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']),
  source: z.enum(['website', 'referral', 'phone', 'walk_in', 'social_media', 'other']),
  serviceType: z.string().optional(),
  notes: z.string().optional(),
});

type LeadUpdateValues = z.infer<typeof leadUpdateSchema>;

export default function LeadDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: lead, isLoading } = useGetLead(id, { query: { enabled: !!id, queryKey: getGetLeadQueryKey(id) } });
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();

  const form = useForm<LeadUpdateValues>({
    resolver: zodResolver(leadUpdateSchema),
    defaultValues: {
      name: '', email: '', phone: '', address: '', status: 'new', source: 'phone', serviceType: '', notes: ''
    }
  });

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (lead && initializedForId.current !== id) {
      initializedForId.current = id;
      form.reset({
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone,
        address: lead.address || '',
        status: lead.status,
        source: lead.source,
        serviceType: lead.serviceType || '',
        notes: lead.notes || '',
      });
    }
  }, [lead, id, form]);

  const onSubmit = (data: LeadUpdateValues) => {
    updateLead.mutate({ id, data }, {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetLeadQueryKey(id), updated);
        queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        toast({ title: 'Lead updated', description: 'Changes saved successfully.' });
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to update lead.', variant: 'destructive' });
      }
    });
  };

  const handleDelete = () => {
    deleteLead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLeadsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        toast({ title: 'Lead deleted', description: 'Lead has been permanently removed.' });
        setLocation('/leads');
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to delete lead.', variant: 'destructive' });
      }
    });
  };

  const advanceStatus = (newStatus: LeadUpdateValues['status']) => {
    form.setValue('status', newStatus, { shouldDirty: true });
    form.handleSubmit(onSubmit)();
  };

  if (isLoading) {
    return <div className="p-8 animate-pulse text-muted-foreground">Loading lead details...</div>;
  }

  if (!lead) {
    return <div className="p-8 text-destructive">Lead not found.</div>;
  }

  const pipelineStages = ['new', 'contacted', 'qualified', 'proposal', 'won'];
  const currentStageIndex = pipelineStages.indexOf(lead.status);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/leads')} className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{lead.name}</h1>
            <p className="text-sm text-muted-foreground">Lead #{lead.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button data-testid="button-delete-lead" variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/10">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the lead.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction data-testid="button-confirm-delete" onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button data-testid="button-save-lead" size="sm" onClick={form.handleSubmit(onSubmit)} disabled={!form.formState.isDirty || updateLead.isPending}>
            <Save className="w-4 h-4 mr-2" /> 
            {updateLead.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Pipeline Status Bar */}
      <Card className="overflow-hidden border-primary/20 bg-primary/5">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-medium mb-3">Pipeline Status</h3>
              <div className="flex items-center gap-2">
                {pipelineStages.map((stage, i) => (
                  <React.Fragment key={stage}>
                    <div 
                      className={`flex-1 h-2 rounded-full transition-colors ${
                        i <= currentStageIndex ? 'bg-primary' : 'bg-primary/20'
                      }`}
                    />
                  </React.Fragment>
                ))}
              </div>
              <div className="flex justify-between mt-2 px-1">
                {pipelineStages.map((stage) => (
                  <span key={stage} className={`text-[10px] uppercase font-bold tracking-wider ${
                    stage === lead.status ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {stage}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-4 md:mt-0 pt-4 md:pt-0 border-t border-border/50 md:border-t-0 md:border-l md:pl-6">
              {currentStageIndex < pipelineStages.length - 1 && lead.status !== 'lost' && (
                <Button 
                  size="sm" 
                  onClick={() => advanceStatus(pipelineStages[currentStageIndex + 1] as any)}
                  className="w-full md:w-auto shadow-sm"
                >
                  Advance to {pipelineStages[currentStageIndex + 1]} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {lead.status !== 'won' && lead.status !== 'lost' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => advanceStatus('lost')}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                >
                  Mark as Lost
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form id="lead-form" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...form.register('name')} />
                    {form.formState.errors.name && <span className="text-xs text-destructive">{form.formState.errors.name.message}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serviceType">Service Requested</Label>
                    <Input id="serviceType" {...form.register('serviceType')} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" {...form.register('phone')} />
                    {form.formState.errors.phone && <span className="text-xs text-destructive">{form.formState.errors.phone.message}</span>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" {...form.register('email')} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Service Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="address" {...form.register('address')} className="pl-9" />
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea id="notes" {...form.register('notes')} rows={6} className="resize-none" placeholder="Add specifics about their HVAC setup, property size, budget, etc." />
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attributes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select onValueChange={(v) => { form.setValue('status', v as any, { shouldDirty: true }); }} value={form.watch('status')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lead Source</Label>
                <Select onValueChange={(v) => { form.setValue('source', v as any, { shouldDirty: true }); }} value={form.watch('source')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="social_media">Social Media</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between text-muted-foreground border-b border-border pb-2">
                <div className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> Created</div>
                <div className="font-mono text-foreground">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <div className="flex items-center"><Clock className="w-4 h-4 mr-2" /> Last Updated</div>
                <div className="font-mono text-foreground">
                  {new Date(lead.updatedAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}