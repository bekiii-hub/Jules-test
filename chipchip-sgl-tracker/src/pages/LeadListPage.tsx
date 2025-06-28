import React, { useState, useRef } from 'react';
import { Lead, LeadStatus } from '@/types/lead';
import { Salesperson } from '@/types/sales';
import Papa from 'papaparse';
import { OnboardedLeader } from '@/types/onboardedLeader';
import useLocalStorage from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { normalizePhone } from '@/lib/utils';
import toast from 'react-hot-toast'; // Import toast
// Placeholders for shadcn/ui components
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { Input } from "@/components/ui/input";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Temporary simple InputField, will be replaced by shadcn Input
const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
  <div className="mb-3">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <input id={id} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
  </div>
);

// Temporary simple SelectField, will be replaced by shadcn Select
const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, options: {value: string, label: string}[] }> = ({ label, id, options, ...props }) => (
  <div className="mb-3">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <select id={id} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
);


const LeadListPage: React.FC = () => {
  const [leads, setLeads] = useLocalStorage<Lead[]>('leads', []);
  const [salesTeam] = useLocalStorage<Salesperson[]>('salesTeam', []); // For salesperson dropdown
  const [onboardedLeaders, setOnboardedLeaders] = useLocalStorage<OnboardedLeader[]>('onboardedLeaders', []);


  const [showAddForm, setShowAddForm] = useState(false);
  const [newLead, setNewLead] = useState<Partial<Omit<Lead, 'id' | 'isPromoted'>>>({
    name: '',
    phone: '',
    location: '',
    status: 'Not contacted',
    source: 'From List', // Default source
  });

  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editedLeadData, setEditedLeadData] = useState<Partial<Lead>>({});

  const leadStatusOptions: LeadStatus[] = [
    "Not contacted", "Contacted", "Needs follow-up", "Appointment set",
    "Awaiting decision", "Converted", "Not interested"
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewLead(prev => ({ ...prev, [name]: value }));
  };

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLead.name && newLead.phone && newLead.location && newLead.salesperson && newLead.status && newLead.source) {
      const normalizedPhoneNumber = normalizePhone(newLead.phone);
      if (!normalizedPhoneNumber.startsWith('+251') && newLead.phone) {
        toast.error(`Phone for ${newLead.name} may be incorrect. Expected +251...`);
      }
      const leadToAdd: Lead = {
        id: Date.now().toString(),
        name: newLead.name,
        phone: normalizedPhoneNumber, // Use normalized phone
        location: newLead.location,
        status: newLead.status,
        remark: newLead.remark,
        appointment: newLead.appointment,
        salesperson: newLead.salesperson,
        source: newLead.source || 'From List',
        cohort: newLead.cohort,
        isPromoted: false,
      };
      setLeads(prevLeads => [...prevLeads, leadToAdd]);
      toast.success("Lead added successfully!");
      setNewLead({ name: '', phone: '', location: '', status: 'Not contacted', source: 'From List', remark: '', appointment: '', salesperson: '', cohort: '' });
      setShowAddForm(false);
    } else {
      toast.error("Please fill all required fields: Name, Phone, Location, Salesperson, Status, Source.");
    }
  };

  const handlePromoteLead = (leadId: string) => {
    const leadToPromote = leads.find(lead => lead.id === leadId);
    if (!leadToPromote) {
      toast.error("Error: Lead not found to promote.");
      return;
    }

    // 1. Update lead's isPromoted status
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, isPromoted: true } : lead
      )
    );

    // 2. Create OnboardedLeader entry
    const newOnboardedLeader: OnboardedLeader = {
      id: leadToPromote.id,
      name: leadToPromote.name, // Readonly field
      phone: leadToPromote.phone, // Readonly field
      location: leadToPromote.location,
      upgradeDate: new Date().toISOString().split('T')[0], // Current date as YYYY-MM-DD
      ordered: false, // Default value
      salesperson: leadToPromote.salesperson,
      source: leadToPromote.source,
      cohort: leadToPromote.cohort,
      remark: leadToPromote.remark, // Carry over remark
    };

    // 3. Add to onboardedLeaders list
    setOnboardedLeaders(prevOnboarded => [...prevOnboarded, newOnboardedLeader]);

    toast.success(`${leadToPromote.name} promoted to Onboarded Leaders!`);
  };

  // const handleCSVUpload = (file: File) => { /* ... */ };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse<any>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedLeads: Lead[] = [];
          let errors: string[] = [];
          results.data.forEach((row, index) => {
            // Validate required fields (case-insensitive headers)
            const lowerRow = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase(), v]));
            const { name, phone, location, salesperson, cohort } = lowerRow;

            if (!name || !phone || !location || !salesperson) {
              errors.push(`Row ${index + 2}: Missing required fields (Name, Phone, Location, Salesperson).`);
              return;
            }

            // TODO: Add phone normalization here if possible, or mark for later global implementation
            // For now, using phone as is.
            let normalizedCsvPhone = phone ? phone.trim() : '';
            if (phone) { // Ensure phone is not undefined or null before trimming/normalizing
                normalizedCsvPhone = normalizePhone(phone.trim());
                if (!normalizedCsvPhone.startsWith('+251')) {
                    errors.push(`Row ${index + 2} (Lead: ${name}): Phone "${phone}" could not be normalized and will be stored as is or needs correction.`);
                    // Store original or partially normalized if it's critical, or skip row by returning earlier
                    // For now, we'll store what normalizePhone returns, which might be the original.
                }
            } else { // phone is empty or undefined from CSV
                 errors.push(`Row ${index + 2} (Lead: ${name}): Phone field is empty.`);
                 // Depending on strictness, you might want to 'return;' here to skip adding this lead.
                 // For now, we'll add it with an empty phone, though validation already checks for phone.
                 // The initial validation `if (!name || !phone ...)` should catch this.
            }


            const newLeadEntry: Lead = {
              id: `csv-${Date.now()}-${index}`, // Unique ID for CSV imports
              name: name.trim(),
              phone: normalizedCsvPhone, // Use normalized phone
              location: location.trim(),
              salesperson: salesperson.trim(),
              status: 'Not contacted', // Default status
              source: 'From List', // Default source
              cohort: cohort?.trim() || undefined, // Optional cohort
              isPromoted: false,
              remark: lowerRow.remark?.trim() || undefined,
              appointment: lowerRow.appointment?.trim() || undefined,
            };
            parsedLeads.push(newLeadEntry);
          });

          if (errors.length > 0) {
            toast.error(`CSV Import Issues:\n${errors.join('\n')}`, { duration: 5000 });
          }
          if (parsedLeads.length > 0) {
            setLeads(prev => [...prev, ...parsedLeads]);
            toast.success(`${parsedLeads.length} leads imported successfully!`);
          } else if (errors.length === 0 && results.data.length > 0) { // If results.data was not empty but parsedLeads is
             toast.error("No valid leads found in CSV after filtering, or all rows had errors.");
          } else if (results.data.length === 0) { // CSV was empty or only had headers
            toast.error("CSV file is empty or contains only headers.");
          }

          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },
        error: (error) => {
          toast.error(`CSV parsing error: ${error.message}`);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      });
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleExportLeads = () => {
    const leadsToExport = displayedLeads;
    if (leadsToExport.length === 0) {
      toast.error("No leads to export.");
      return;
    }
    const headers = ["Name", "Phone", "Location", "Status", "Remark", "Appointment", "Salesperson", "Source", "Cohort"];
    const csvData = leadsToExport.map(lead => ({
        Name: lead.name,
        Phone: lead.phone, // Already normalized
        Location: lead.location,
        Status: lead.status,
        Remark: lead.remark || '',
        Appointment: lead.appointment || '',
        Salesperson: lead.salesperson || '',
        Source: lead.source,
        Cohort: lead.cohort || ''
    }));

    const csv = Papa.unparse({ fields: headers, data: csvData });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `leadlist_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Lead list exported successfully!");
  };

  const handleStartEdit = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setEditedLeadData({
      status: lead.status,
      remark: lead.remark,
      appointment: lead.appointment,
      salesperson: lead.salesperson,
    });
  };

  const handleCancelEdit = () => {
    setEditingLeadId(null);
    setEditedLeadData({});
  };

  const handleSaveEdit = (leadId: string) => {
    setLeads(prevLeads =>
      prevLeads.map(l =>
        l.id === leadId ? { ...l, ...editedLeadData } : l
      )
    );
    setEditingLeadId(null);
    setEditedLeadData({});
    toast.success("Lead updated successfully!");
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditedLeadData(prev => ({ ...prev, [name]: value }));
  };


  const displayedLeads = leads.filter(lead => !lead.isPromoted);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Lead List</h2>
        <div className="flex space-x-2">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            ref={fileInputRef}
          />
          <Button variant="outline" onClick={triggerFileUpload}>
            Upload CSV
          </Button>
          <Button variant="outline" onClick={handleExportLeads} disabled={displayedLeads.length === 0}>
            Export Leads
          </Button>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : 'Add Lead'}
          </Button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddLead} className="mb-6 p-4 border rounded-md shadow bg-gray-50">
          <h3 className="text-lg font-medium mb-3">Add New Lead</h3>
          <InputField label="Name*" name="name" value={newLead.name} onChange={handleInputChange} required />
          <InputField label="Phone*" name="phone" type="tel" value={newLead.phone} onChange={handleInputChange} required />
          <InputField label="Location*" name="location" value={newLead.location} onChange={handleInputChange} required />
          <SelectField
            label="Status*"
            name="status"
            value={newLead.status}
            onChange={handleInputChange}
            options={leadStatusOptions.map(s => ({ value: s, label: s }))}
            required
          />
          <InputField label="Remark" name="remark" value={newLead.remark || ''} onChange={handleInputChange} />
          <InputField label="Appointment Date" name="appointment" type="date" value={newLead.appointment || ''} onChange={handleInputChange} />
          <SelectField
            label="Salesperson*"
            name="salesperson"
            value={newLead.salesperson || ''}
            onChange={handleInputChange}
            options={[{value: '', label: 'Select Salesperson'}, ...salesTeam.map(s => ({ value: s.name, label: s.name }))]} // Assuming salesperson name is unique for now
            required
          />
          <InputField label="Source" name="source" value={newLead.source} onChange={handleInputChange} />
          <InputField label="Cohort" name="cohort" value={newLead.cohort || ''} onChange={handleInputChange} />
          <Button type="submit" className="mt-3">Save Lead</Button>
        </form>
      )}

      {displayedLeads.length === 0 && !showAddForm ? (
        <p>No active leads. Add a new lead or upload a CSV.</p>
      ) : (
        <div className="overflow-x-auto">
          {/* Placeholder for Table with inline editing and promote button */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Phone", "Location", "Status", "Remark", "Appointment", "Salesperson", "Source", "Cohort", "Actions"].map(header => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedLeads.map((lead) => {
                const isEditing = editingLeadId === lead.id;
                return (
                  <tr key={lead.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{lead.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{lead.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{lead.location}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <SelectField
                          name="status"
                          value={editedLeadData.status || lead.status}
                          onChange={handleEditInputChange}
                          options={leadStatusOptions.map(s => ({ value: s, label: s }))}
                          className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                        />
                      ) : (
                        lead.status
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <InputField
                          name="remark"
                          type="text"
                          value={editedLeadData.remark || lead.remark || ''}
                          onChange={handleEditInputChange}
                          className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                        />
                      ) : (
                        lead.remark || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <InputField
                          name="appointment"
                          type="date"
                          value={editedLeadData.appointment || lead.appointment || ''}
                          onChange={handleEditInputChange}
                          className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                        />
                      ) : (
                        lead.appointment || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {isEditing ? (
                        <SelectField
                          name="salesperson"
                          value={editedLeadData.salesperson || lead.salesperson || ''}
                          onChange={handleEditInputChange}
                          options={[{value: '', label: 'Select Salesperson'}, ...salesTeam.map(s => ({ value: s.name, label: s.name }))]}
                          className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm sm:text-sm"
                        />
                      ) : (
                        lead.salesperson || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{lead.source}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{lead.cohort || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                      {isEditing ? (
                        <>
                          <Button variant="default" size="sm" onClick={() => handleSaveEdit(lead.id)}>Save</Button>
                          <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleStartEdit(lead)}>Edit</Button>
                          <Button variant="default" size="sm" onClick={() => handlePromoteLead(lead.id)}>Promote</Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeadListPage;

// Temporary simple InputField, will be replaced by shadcn Input
const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
  <div className="mb-3">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <input id={id} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
  </div>
);

// Temporary simple SelectField, will be replaced by shadcn Select
const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, options: {value: string, label: string}[] }> = ({ label, id, options, ...props }) => (
  <div className="mb-3">
    <label htmlFor={id} className="block text-sm font-medium">{label}</label>
    <select id={id} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
);


const LeadListPage: React.FC = () => {
  const [leads, setLeads] = useLocalStorage<Lead[]>('leads', []);
  const [salesTeam] = useLocalStorage<Salesperson[]>('salesTeam', []); // For salesperson dropdown

  const [showAddForm, setShowAddForm] = useState(false);
  const [newLead, setNewLead] = useState<Partial<Omit<Lead, 'id' | 'isPromoted'>>>({
    name: '',
    phone: '',
    location: '',
    status: 'Not contacted',
    source: 'From List', // Default source
  });

  // TODO: States for inline editing
  // const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  // const [editedFields, setEditedFields] = useState<Partial<Lead>>({});

  const leadStatusOptions: LeadStatus[] = [
    "Not contacted", "Contacted", "Needs follow-up", "Appointment set",
    "Awaiting decision", "Converted", "Not interested"
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewLead(prev => ({ ...prev, [name]: value }));
  };

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLead.name && newLead.phone && newLead.location && newLead.salesperson) { // Basic validation
      const leadToAdd: Lead = {
        id: Date.now().toString(),
        name: newLead.name,
        phone: newLead.phone,
        location: newLead.location,
        status: newLead.status || 'Not contacted',
        remark: newLead.remark,
        appointment: newLead.appointment,
        salesperson: newLead.salesperson,
        source: newLead.source || 'From List',
        cohort: newLead.cohort,
        isPromoted: false,
      };
      setLeads(prevLeads => [...prevLeads, leadToAdd]);
      setNewLead({ name: '', phone: '', location: '', status: 'Not contacted', source: 'From List', remark: '', appointment: '', salesperson: '', cohort: '' });
      setShowAddForm(false);
    } else {
      alert("Please fill in all required fields (Name, Phone, Location, Salesperson).");
    }
  };

  // TODO: Implement handlePromoteLead
  // const handlePromoteLead = (leadId: string) => { /* ... */ };

  // TODO: Implement handleCSVUpload
  // const handleCSVUpload = (file: File) => { /* ... */ };

  // TODO: Implement inline editing handlers
  // const startEdit = (lead: Lead) => { /* ... */ }
  // const cancelEdit = () => { /* ... */ }
  // const saveEdit = (leadId: string) => { /* ... */ }
  // const handleInlineChange = (leadId: string, field: keyof Lead, value: any) => { /* ... */ }

  const displayedLeads = leads.filter(lead => !lead.isPromoted);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Lead List</h2>
        {/* TODO: Add CSV Upload Button here */}
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : 'Add Lead'}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddLead} className="mb-6 p-4 border rounded-md shadow bg-gray-50">
          <h3 className="text-lg font-medium mb-3">Add New Lead</h3>
          <InputField label="Name*" name="name" value={newLead.name} onChange={handleInputChange} required />
          <InputField label="Phone*" name="phone" type="tel" value={newLead.phone} onChange={handleInputChange} required />
          <InputField label="Location*" name="location" value={newLead.location} onChange={handleInputChange} required />
          <SelectField
            label="Status*"
            name="status"
            value={newLead.status}
            onChange={handleInputChange}
            options={leadStatusOptions.map(s => ({ value: s, label: s }))}
            required
          />
          <InputField label="Remark" name="remark" value={newLead.remark || ''} onChange={handleInputChange} />
          <InputField label="Appointment Date" name="appointment" type="date" value={newLead.appointment || ''} onChange={handleInputChange} />
          <SelectField
            label="Salesperson*"
            name="salesperson"
            value={newLead.salesperson || ''}
            onChange={handleInputChange}
            options={[{value: '', label: 'Select Salesperson'}, ...salesTeam.map(s => ({ value: s.name, label: s.name }))]} // Assuming salesperson name is unique for now
            required
          />
          <InputField label="Source" name="source" value={newLead.source} onChange={handleInputChange} />
          <InputField label="Cohort" name="cohort" value={newLead.cohort || ''} onChange={handleInputChange} />
          <Button type="submit" className="mt-3">Save Lead</Button>
        </form>
      )}

      {displayedLeads.length === 0 && !showAddForm ? (
        <p>No active leads. Add a new lead or upload a CSV.</p>
      ) : (
        <div className="overflow-x-auto">
          {/* Placeholder for Table with inline editing and promote button */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Phone", "Location", "Status", "Remark", "Appointment", "Salesperson", "Source", "Cohort", "Actions"].map(header => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedLeads.map((lead) => (
                // TODO: Replace with editable row component
                <tr key={lead.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{lead.name}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{lead.phone}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{lead.location}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{lead.status}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{lead.remark || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{lead.appointment || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{lead.salesperson || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{lead.source}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{lead.cohort || '-'}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <Button variant="outline" size="sm" onClick={() => alert(`Promote ${lead.name} - TBD`)}>Promote</Button>
                    {/* Add Edit button here for inline editing */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeadListPage;
