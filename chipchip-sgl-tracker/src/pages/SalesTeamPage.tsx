import React, { useState } from 'react';
import { Salesperson } from '@/types/sales';
import { Button } from '@/components/ui/button';
import useLocalStorage from '@/hooks/useLocalStorage';
import { normalizePhone } from '@/lib/utils';
import toast from 'react-hot-toast'; // Import toast

// Basic Input and Form components (will be replaced/enhanced with shadcn/ui later)
// For now, using simple HTML elements for brevity in this step.
const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, id, ...props }) => (
  <div className="mb-2">
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
    <input id={id} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
  </div>
);


const SalesTeamPage: React.FC = () => {
  const [salesTeam, setSalesTeam] = useLocalStorage<Salesperson[]>('salesTeam', []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSalesperson, setNewSalesperson] = useState<Omit<Salesperson, 'id'>>({
    name: '',
    phone: '',
    region: '',
    joinedDate: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewSalesperson(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSalesperson = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSalesperson.name && newSalesperson.phone && newSalesperson.region && newSalesperson.joinedDate) {
      const normalizedPhoneNumber = normalizePhone(newSalesperson.phone);
      if (!normalizedPhoneNumber.startsWith('+251') && newSalesperson.phone) {
        toast.error(`Phone "${newSalesperson.phone}" may not be correctly formatted. Expected +251...`);
        // Still saving, as per previous logic.
      }

      setSalesTeam([...salesTeam, { ...newSalesperson, phone: normalizedPhoneNumber, id: Date.now().toString() }]);
      toast.success("Salesperson added successfully!");
      setNewSalesperson({ name: '', phone: '', region: '', joinedDate: '' }); // Reset form
      setShowAddForm(false); // Hide form after adding
    } else {
      toast.error("Please fill in all fields.");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Sales Team Management</h2>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : 'Add Salesperson'}
        </Button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSalesperson} className="mb-6 p-4 border rounded-md shadow-sm bg-gray-50">
          <h3 className="text-lg font-medium mb-3">Add New Salesperson</h3>
          <InputField label="Name" id="name" name="name" value={newSalesperson.name} onChange={handleInputChange} required />
          <InputField label="Phone" id="phone" name="phone" type="tel" value={newSalesperson.phone} onChange={handleInputChange} required />
          <InputField label="Region" id="region" name="region" value={newSalesperson.region} onChange={handleInputChange} required />
          <InputField label="Joined Date" id="joinedDate" name="joinedDate" type="date" value={newSalesperson.joinedDate} onChange={handleInputChange} required />
          <Button type="submit" className="mt-2">Save Salesperson</Button>
        </form>
      )}

      {salesTeam.length === 0 && !showAddForm ? (
        <p className="text-gray-500">No salespeople added yet. Click "Add Salesperson" to get started.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
                {/* Add actions column later if needed (e.g., Edit, Delete) */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesTeam.map((person) => (
                <tr key={person.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{person.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.region}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.joinedDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SalesTeamPage;
