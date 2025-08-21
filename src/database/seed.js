const db = require('../config/database');

const usStates = [
  { state_code: 'AL', state_name: 'Alabama', region: 'Southeast' },
  { state_code: 'AK', state_name: 'Alaska', region: 'West' },
  { state_code: 'AZ', state_name: 'Arizona', region: 'Southwest' },
  { state_code: 'AR', state_name: 'Arkansas', region: 'Southeast' },
  { state_code: 'CA', state_name: 'California', region: 'West' },
  { state_code: 'CO', state_name: 'Colorado', region: 'West' },
  { state_code: 'CT', state_name: 'Connecticut', region: 'Northeast' },
  { state_code: 'DE', state_name: 'Delaware', region: 'Northeast' },
  { state_code: 'FL', state_name: 'Florida', region: 'Southeast' },
  { state_code: 'GA', state_name: 'Georgia', region: 'Southeast' },
  { state_code: 'HI', state_name: 'Hawaii', region: 'West' },
  { state_code: 'ID', state_name: 'Idaho', region: 'West' },
  { state_code: 'IL', state_name: 'Illinois', region: 'Midwest' },
  { state_code: 'IN', state_name: 'Indiana', region: 'Midwest' },
  { state_code: 'IA', state_name: 'Iowa', region: 'Midwest' },
  { state_code: 'KS', state_name: 'Kansas', region: 'Midwest' },
  { state_code: 'KY', state_name: 'Kentucky', region: 'Southeast' },
  { state_code: 'LA', state_name: 'Louisiana', region: 'Southeast' },
  { state_code: 'ME', state_name: 'Maine', region: 'Northeast' },
  { state_code: 'MD', state_name: 'Maryland', region: 'Northeast' },
  { state_code: 'MA', state_name: 'Massachusetts', region: 'Northeast' },
  { state_code: 'MI', state_name: 'Michigan', region: 'Midwest' },
  { state_code: 'MN', state_name: 'Minnesota', region: 'Midwest' },
  { state_code: 'MS', state_name: 'Mississippi', region: 'Southeast' },
  { state_code: 'MO', state_name: 'Missouri', region: 'Midwest' },
  { state_code: 'MT', state_name: 'Montana', region: 'West' },
  { state_code: 'NE', state_name: 'Nebraska', region: 'Midwest' },
  { state_code: 'NV', state_name: 'Nevada', region: 'West' },
  { state_code: 'NH', state_name: 'New Hampshire', region: 'Northeast' },
  { state_code: 'NJ', state_name: 'New Jersey', region: 'Northeast' },
  { state_code: 'NM', state_name: 'New Mexico', region: 'Southwest' },
  { state_code: 'NY', state_name: 'New York', region: 'Northeast' },
  { state_code: 'NC', state_name: 'North Carolina', region: 'Southeast' },
  { state_code: 'ND', state_name: 'North Dakota', region: 'Midwest' },
  { state_code: 'OH', state_name: 'Ohio', region: 'Midwest' },
  { state_code: 'OK', state_name: 'Oklahoma', region: 'Southwest' },
  { state_code: 'OR', state_name: 'Oregon', region: 'West' },
  { state_code: 'PA', state_name: 'Pennsylvania', region: 'Northeast' },
  { state_code: 'RI', state_name: 'Rhode Island', region: 'Northeast' },
  { state_code: 'SC', state_name: 'South Carolina', region: 'Southeast' },
  { state_code: 'SD', state_name: 'South Dakota', region: 'Midwest' },
  { state_code: 'TN', state_name: 'Tennessee', region: 'Southeast' },
  { state_code: 'TX', state_name: 'Texas', region: 'Southwest' },
  { state_code: 'UT', state_name: 'Utah', region: 'West' },
  { state_code: 'VT', state_name: 'Vermont', region: 'Northeast' },
  { state_code: 'VA', state_name: 'Virginia', region: 'Southeast' },
  { state_code: 'WA', state_name: 'Washington', region: 'West' },
  { state_code: 'WV', state_name: 'West Virginia', region: 'Southeast' },
  { state_code: 'WI', state_name: 'Wisconsin', region: 'Midwest' },
  { state_code: 'WY', state_name: 'Wyoming', region: 'West' },
  { state_code: 'DC', state_name: 'District of Columbia', region: 'Northeast' },
  { state_code: 'AS', state_name: 'American Samoa', region: 'Territories' },
  { state_code: 'GU', state_name: 'Guam', region: 'Territories' },
  { state_code: 'MP', state_name: 'Northern Mariana Islands', region: 'Territories' },
  { state_code: 'PR', state_name: 'Puerto Rico', region: 'Territories' },
  { state_code: 'VI', state_name: 'U.S. Virgin Islands', region: 'Territories' },
];

const seedStates = async () => {
  try {
    console.log('Seeding states table...');
    
    // First check if states table exists
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'states'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('States table does not exist. Please run migrations first: npm run migrate');
      return;
    }
    
    for (const state of usStates) {
      const query = `
        INSERT INTO states (state_code, state_name, region)
        VALUES ($1, $2, $3)
        ON CONFLICT (state_code) DO NOTHING
      `;
      await db.query(query, [state.state_code, state.state_name, state.region]);
    }
    
    console.log('States table seeded successfully');
  } catch (error) {
    console.error('Error seeding states:', error);
    throw error;
  }
};

const seedDatabase = async () => {
  try {
    await seedStates();
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, seedStates };
