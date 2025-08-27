import React, { useState } from 'react';
import { Tabs, Card } from 'antd';
import ComprehensiveDashboard from './ComprehensiveDashboard';
import ProcessingSessionsTab from './ProcessingSessionsTab';

const ComprehensiveDashboardWithTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState('npa-nxx');

  const tabItems = [
    {
      key: 'npa-nxx',
      label: 'NPA NXX Processing',
      children: <ComprehensiveDashboard />
    },
    {
      key: 'processing-sessions',
      label: 'Processing Sessions',
      children: <ProcessingSessionsTab />
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>
    </div>
  );
};

export default ComprehensiveDashboardWithTabs;
