import React, { useState, useEffect, useMemo } from 'react';
import { OnboardedLeader } from '@/types/onboardedLeader';
import { Salesperson } from '@/types/sales';
import { Lead } from '@/types/lead'; // For cohort insights
import useLocalStorage from '@/hooks/useLocalStorage';
import { getWeekRange, isDateInWeek, getRecentWeeks, formatDateToYYYYMMDD } from '@/lib/dateUtils';

// Placeholder for shadcn/ui Select (will be replaced later)
const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, options: {value: string, label: string}[] }> = ({ label, id, options, ...props }) => (
  <div className="mb-2">
    {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>}
    <select id={id} {...props} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md">
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </div>
);

const WEEKLY_TARGET = 6;

interface SalesPerformance {
  salespersonName: string;
  upgradedCount: number;
  orderedCount: number;
  progress: number; // Percentage towards target or raw count
}

const PerformanceDashboardPage: React.FC = () => {
  const [onboardedLeaders] = useLocalStorage<OnboardedLeader[]>('onboardedLeaders', []);
  const [salesTeam] = useLocalStorage<Salesperson[]>('salesTeam', []);
  const [leads] = useLocalStorage<Lead[]>('leads', []); // For cohort data

  const recentWeeks = useMemo(() => getRecentWeeks(12), []);
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(() => {
    // Default to the start of the current week
    const { weekStart } = getWeekRange(new Date());
    return formatDateToYYYYMMDD(weekStart);
  });
  const [selectedSalesperson, setSelectedSalesperson] = useState<string>(''); // Empty string for "All"

  const { weekStart, weekEnd } = useMemo(() => {
    const start = new Date(selectedWeekStart);
    // Adjust because getWeekRange expects a date within the target week,
    // and selectedWeekStart is already the start of the week.
    // Add a day to ensure it falls within the week it represents if it's UTC midnight.
    const dateInSelectedWeek = new Date(start);
    dateInSelectedWeek.setDate(start.getDate() + 1);
    return getWeekRange(dateInSelectedWeek);
  }, [selectedWeekStart]);

  const filteredLeaders = useMemo(() => {
    return onboardedLeaders.filter(leader => {
      const isInWeek = isDateInWeek(leader.upgradeDate, weekStart, weekEnd);
      const matchesSalesperson = selectedSalesperson ? leader.salesperson === selectedSalesperson : true;
      return isInWeek && matchesSalesperson;
    });
  }, [onboardedLeaders, weekStart, weekEnd, selectedSalesperson]);

  const totalUpgradedThisWeek = filteredLeaders.length;
  const totalOrderedThisWeek = filteredLeaders.filter(leader => leader.ordered).length;

  const salesPerformanceData: SalesPerformance[] = useMemo(() => {
    const performanceMap = new Map<string, { upgraded: number, ordered: number }>();

    // Initialize map for all salespeople or selected one
    const targetSalesTeam = selectedSalesperson
        ? salesTeam.filter(s => s.name === selectedSalesperson)
        : salesTeam;

    targetSalesTeam.forEach(sp => {
      performanceMap.set(sp.name, { upgraded: 0, ordered: 0 });
    });

    filteredLeaders.forEach(leader => {
      if (leader.salesperson) {
        const current = performanceMap.get(leader.salesperson) || { upgraded: 0, ordered: 0 };
        current.upgraded += 1;
        if (leader.ordered) {
          current.ordered += 1;
        }
        performanceMap.set(leader.salesperson, current);
      }
    });

    return Array.from(performanceMap.entries()).map(([name, data]) => ({
      salespersonName: name,
      upgradedCount: data.upgraded,
      orderedCount: data.ordered,
      progress: WEEKLY_TARGET > 0 ? Math.min((data.upgraded / WEEKLY_TARGET) * 100, 100) : 0, // Progress against overall target
    }));
  }, [filteredLeaders, salesTeam, selectedSalesperson]);


  const cohortInsights = useMemo(() => {
    if (!leads.length) return [];

    const cohorts: { [key: string]: { totalLeads: number, promotedLeads: number } } = {};

    leads.forEach(lead => {
      const cohortName = lead.cohort || "Unassigned";
      if (!cohorts[cohortName]) {
        cohorts[cohortName] = { totalLeads: 0, promotedLeads: 0 };
      }
      cohorts[cohortName].totalLeads++;
      // Check if this lead was promoted (exists in onboardedLeaders by original ID)
      if (onboardedLeaders.some(ol => ol.id === lead.id)) {
        cohorts[cohortName].promotedLeads++;
      }
    });

    return Object.entries(cohorts).map(([cohortName, data]) => {
      const conversionRate = data.totalLeads > 0 ? (data.promotedLeads / data.totalLeads) * 100 : 0;
      let badge = '🔴'; // Low
      if (conversionRate > 66) badge = '🟢'; // High
      else if (conversionRate > 33) badge = '🟡'; // Medium

      return {
        name: cohortName,
        totalLeads: data.totalLeads,
        promotedLeads: data.promotedLeads,
        conversionRate: conversionRate.toFixed(1),
        badge,
      };
    }).sort((a,b) => b.totalLeads - a.totalLeads); // Sort by total leads or by name
  }, [leads, onboardedLeaders]);


  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Performance Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Select
          label="Select Week"
          options={recentWeeks}
          value={selectedWeekStart}
          onChange={(e) => setSelectedWeekStart(e.target.value)}
        />
        <Select
          label="Select Salesperson (All)"
          options={[{value: '', label: 'All Salespeople'}, ...salesTeam.map(s => ({ value: s.name, label: s.name }))]}
          value={selectedSalesperson}
          onChange={(e) => setSelectedSalesperson(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-500">Weekly Onboarding Target</h3>
          <p className="text-3xl font-semibold text-primary">{WEEKLY_TARGET}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-500">Total Upgraded (Selected Week)</h3>
          <p className="text-3xl font-semibold text-primary">{totalUpgradedThisWeek}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-500">Total Ordered (Selected Week)</h3>
          <p className="text-3xl font-semibold text-primary">{totalOrderedThisWeek}</p>
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-4">Sales Team Performance (Selected Week)</h3>
      {salesPerformanceData.length > 0 ? (
        <div className="overflow-x-auto bg-white p-4 rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salesperson</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Upgraded</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress vs Target ({WEEKLY_TARGET})</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salesPerformanceData.map(perf => (
                <tr key={perf.salespersonName}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{perf.salespersonName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{perf.upgradedCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{perf.orderedCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-primary h-4 rounded-full text-xs text-white flex items-center justify-center"
                        style={{ width: `${perf.progress}%` }}
                      >
                        {perf.upgradedCount} ({perf.progress.toFixed(0)}%)
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500">No performance data for the selected criteria.</p>
      )}

      <div className="mt-8 bg-white p-4 rounded-lg shadow">
        <h3 className="text-xl font-semibold mb-4">Cohort Insights (All Time)</h3>
        {cohortInsights.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cohort</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Leads</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Promoted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cohortInsights.map(cohort => (
                  <tr key={cohort.name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{cohort.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{cohort.totalLeads}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{cohort.promotedLeads}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {cohort.badge} {cohort.conversionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No cohort data available or no leads processed yet.</p>
        )}
      </div>

    </div>
  );
};

export default PerformanceDashboardPage;
