import React, { useState, useEffect, useMemo } from 'react';
import { CheckInRecord } from '@/types/checkIn';
import { Salesperson } from '@/types/sales';
import useLocalStorage from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { formatDateToYYYYMMDD } from '@/lib/dateUtils';
import toast from 'react-hot-toast'; // Import toast

// Placeholder for shadcn/ui Select and Input (will be replaced later)
const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, options: {value: string, label: string}[] }> = ({ label, id, options, ...props }) => (
  <div className="mb-3">
    {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>}
    <select id={id} {...props} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md">
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
);
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, id, ...props }) => (
  <div className="mb-3">
    {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>}
    <input id={id} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
  </div>
);


const DailyCheckInPage: React.FC = () => {
  const [checkIns, setCheckIns] = useLocalStorage<CheckInRecord[]>('checkIns', []);
  const [salesTeam] = useLocalStorage<Salesperson[]>('salesTeam', []);

  const [selectedSalesperson, setSelectedSalesperson] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(formatDateToYYYYMMDD(new Date()));

  useEffect(() => {
    // Pre-select first salesperson if list is available and none selected
    if (salesTeam.length > 0 && !selectedSalesperson) {
      setSelectedSalesperson(salesTeam[0].name);
    }
  }, [salesTeam, selectedSalesperson]);

  const todaysDateYYYYMMDD = useMemo(() => formatDateToYYYYMMDD(new Date()), []);

  const hasCheckedInToday = useMemo(() => {
    if (!selectedSalesperson) return false;
    return checkIns.some(
      (ci) => ci.salespersonName === selectedSalesperson && ci.date === todaysDateYYYYMMDD
    );
  }, [checkIns, selectedSalesperson, todaysDateYYYYMMDD]);

  const handleCheckIn = () => {
    if (!selectedSalesperson) {
      toast.error("Please select a salesperson.");
      return;
    }
    if (hasCheckedInToday) {
      toast.error(`${selectedSalesperson} has already checked in today.`);
      return;
    }

    const newCheckIn: CheckInRecord = {
      id: `checkin-${Date.now()}`,
      salespersonName: selectedSalesperson,
      date: todaysDateYYYYMMDD,
      timestamp: new Date().toISOString(),
    };
    setCheckIns([...checkIns, newCheckIn]);
    toast.success(`${selectedSalesperson} checked in successfully!`);
  };

  const filteredCheckIns = useMemo(() => {
    return checkIns.filter(ci => ci.date === selectedDate);
  }, [checkIns, selectedDate]);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Daily Check-In</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 border rounded-md shadow-sm bg-gray-50">
        <div>
          <Select
            label="Select Salesperson"
            options={salesTeam.map(s => ({ value: s.name, label: s.name }))}
            value={selectedSalesperson}
            onChange={(e) => setSelectedSalesperson(e.target.value)}
            disabled={salesTeam.length === 0}
          />
          {salesTeam.length === 0 && <p className="text-sm text-red-500">No salespeople found. Please add them in the Sales Team tab.</p>}
        </div>
        <div className="flex items-end">
          <Button
            onClick={handleCheckIn}
            disabled={!selectedSalesperson || hasCheckedInToday || salesTeam.length === 0}
            className="w-full"
          >
            {hasCheckedInToday ? 'Already Checked In Today' : 'Check In Now'}
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Input
          label="View Check-ins for Date:"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      <h3 className="text-xl font-semibold mb-4">Check-in Records for {selectedDate}</h3>
      {filteredCheckIns.length === 0 ? (
        <p className="text-gray-500">No check-ins recorded for this date.</p>
      ) : (
        <div className="overflow-x-auto bg-white p-4 rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salesperson</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCheckIns.map(ci => (
                <tr key={ci.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{ci.salespersonName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(ci.timestamp).toLocaleTimeString()}
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

export default DailyCheckInPage;
