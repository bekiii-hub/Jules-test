import React, { useState } from 'react';
import SalesTeamPage from './pages/SalesTeamPage';
import LeadListPage from './pages/LeadListPage';
import OnboardedLeadersPage from './pages/OnboardedLeadersPage';
import PerformanceDashboardPage from './pages/PerformanceDashboardPage';
import DailyCheckInPage from './pages/DailyCheckInPage';
import { Button } from './components/ui/button';
import { Toaster } from 'react-hot-toast'; // Import Toaster

// Placeholder components for other tabs

type TabName = "Lead List" | "Onboarded Leaders" | "Sales Team" | "Performance Dashboard" | "Daily Check-In";

interface Tab {
  name: TabName;
  component: React.FC;
}

const TABS: Tab[] = [
  { name: "Sales Team", component: SalesTeamPage },
  { name: "Lead List", component: LeadListPage },
  { name: "Onboarded Leaders", component: OnboardedLeadersPage },
  { name: "Performance Dashboard", component: PerformanceDashboardPage },
  { name: "Daily Check-In", component: DailyCheckInPage },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabName>("Sales Team");

  const ActiveComponent = TABS.find(tab => tab.name === activeTab)?.component;

  return (
    <div className="container mx-auto p-4">
      <Toaster
        position="top-right"
        toastOptions={{
          success: {
            style: {
              background: '#28a745', // Green background for success
              color: 'white',
            },
          },
          error: {
            style: {
              background: '#dc3545', // Red background for error
              color: 'white',
            },
          },
        }}
      />
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-primary mb-2">
          ChipChip Super Group Leader Tracker
        </h1>
        <nav className="flex space-x-2 border-b">
          {TABS.map((tab) => (
            <Button
              key={tab.name}
              variant={activeTab === tab.name ? "default" : "ghost"}
              onClick={() => setActiveTab(tab.name)}
              className={`pb-2 border-b-2 ${
                activeTab === tab.name
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              } rounded-none`}
            >
              {tab.name}
            </Button>
          ))}
        </nav>
      </header>
      <main>
        {ActiveComponent && <ActiveComponent />}
      </main>
    </div>
  );
}

export default App;
