import React, { useState } from 'react';
import { OnboardedLeader } from '@/types/onboardedLeader';
import { Salesperson } from '@/types/sales';
import useLocalStorage from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import Papa from 'papaparse';
import toast from 'react-hot-toast'; // Import toast

// Temporary simple InputField and SelectField (similar to LeadListPage)
const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, id, ...props }) => (
  <div className="mb-2">
    {label && <label htmlFor={id} className="block text-sm font-medium">{label}</label>}
    <input id={id} {...props} className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
  </div>
);

const SelectField: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, options: {value: string | number | boolean, label: string}[] }> = ({ label, id, options, ...props }) => (
  <div className="mb-2">
    {label && <label htmlFor={id} className="block text-sm font-medium">{label}</label>}
    <select id={id} {...props} className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm">
      {options.map(option => <option key={option.label} value={String(option.value)}>{option.label}</option>)}
    </select>
  </div>
);


const OnboardedLeadersPage: React.FC = () => {
  const [onboardedLeaders, setOnboardedLeaders] = useLocalStorage<OnboardedLeader[]>('onboardedLeaders', []);
  const [salesTeam] = useLocalStorage<Salesperson[]>('salesTeam', []); // For salesperson dropdown

  const [editingLeaderId, setEditingLeaderId] = useState<string | null>(null);
  const [editedLeaderData, setEditedLeaderData] = useState<Partial<OnboardedLeader>>({});

  const orderedOptions = [
    { value: true, label: 'Yes' },
    { value: false, label: 'No' },
  ];

  const handleStartEdit = (leader: OnboardedLeader) => {
    setEditingLeaderId(leader.id);
    setEditedLeaderData({
      ordered: leader.ordered,
      remark: leader.remark,
      salesperson: leader.salesperson,
    });
  };

  const handleCancelEdit = () => {
    setEditingLeaderId(null);
    setEditedLeaderData({});
  };

  const handleSaveEdit = (leaderId: string) => {
    setOnboardedLeaders(prevLeaders =>
      prevLeaders.map(l =>
        l.id === leaderId ? { ...l, ...editedLeaderData } : l
      )
    );
    setEditingLeaderId(null);
    setEditedLeaderData({});
    toast.success("Leader updated successfully!");
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    let processedValue: string | boolean = value;
    if (type === 'checkbox') { // Should be select for 'ordered' but good to be robust
        processedValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'ordered') { // Specifically for our 'ordered' select
        processedValue = value === 'true';
    }

    setEditedLeaderData(prev => ({ ...prev, [name]: processedValue }));
  };

  const needsFollowUp = (leader: OnboardedLeader): boolean => {
    if (leader.ordered) return false;
    const upgradeDate = new Date(leader.upgradeDate);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return upgradeDate < threeDaysAgo;
  };

  const handleExportOnboarded = () => {
    if (onboardedLeaders.length === 0) {
      toast.error("No onboarded leaders to export.");
      return;
    }
    const headers = ["Name", "Phone", "Location", "Upgrade Date", "Ordered", "Salesperson", "Source", "Cohort", "Remark"];
    const csvData = onboardedLeaders.map(leader => ({
      Name: leader.name,
      Phone: leader.phone, // Already normalized during lead creation
      Location: leader.location,
      "Upgrade Date": leader.upgradeDate,
      Ordered: leader.ordered ? 'Yes' : 'No',
      Salesperson: leader.salesperson || '',
      Source: leader.source,
      Cohort: leader.cohort || '',
      Remark: leader.remark || ''
    }));

    const csv = Papa.unparse({ fields: headers, data: csvData });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `onboarded_list_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Onboarded leaders list exported successfully!");
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Onboarded Leaders</h2>
        <Button variant="outline" onClick={handleExportOnboarded} disabled={onboardedLeaders.length === 0}>
            Export Onboarded Leaders
        </Button>
      </div>
      {onboardedLeaders.length === 0 ? (
        <p>No leaders have been onboarded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Phone", "Location", "Upgrade Date", "Ordered", "Salesperson", "Source", "Cohort", "Remark", "Follow Up", "Actions"].map(header => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {onboardedLeaders.map((leader) => {
                const isEditing = editingLeaderId === leader.id;
                return (
                  <tr key={leader.id} className={needsFollowUp(leader) ? 'bg-yellow-100' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{leader.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{leader.phone}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{leader.location}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{leader.upgradeDate}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {isEditing ? (
                        <SelectField
                          name="ordered"
                          value={String(editedLeaderData.ordered ?? leader.ordered)}
                          onChange={handleEditInputChange}
                          options={orderedOptions}
                        />
                      ) : (
                        leader.ordered ? 'Yes' : 'No'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {isEditing ? (
                        <SelectField
                          name="salesperson"
                          value={editedLeaderData.salesperson || leader.salesperson || ''}
                          onChange={handleEditInputChange}
                          options={[{value: '', label: 'Select Salesperson'}, ...salesTeam.map(s => ({ value: s.name, label: s.name }))]}
                        />
                      ) : (
                        leader.salesperson || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{leader.source}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{leader.cohort || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {isEditing ? (
                        <InputField
                          name="remark"
                          type="text"
                          value={editedLeaderData.remark || leader.remark || ''}
                          onChange={handleEditInputChange}
                        />
                      ) : (
                        leader.remark || '-'
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {needsFollowUp(leader) && !isEditing && (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          ⏰ Follow Up
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm space-x-2">
                      {isEditing ? (
                        <>
                          <Button variant="default" size="sm" onClick={() => handleSaveEdit(leader.id)}>Save</Button>
                          <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => handleStartEdit(leader)}>Edit</Button>
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

export default OnboardedLeadersPage;
