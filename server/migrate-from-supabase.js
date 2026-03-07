#!/usr/bin/env node
/**
 * RAHE KABA - Supabase to VPS Data Migration Script
 * Run: cd server && node migrate-from-supabase.js
 * 
 * IMPORTANT: Run this AFTER schema.sql has been applied
 * This script disables triggers during import to avoid double-counting
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Disable triggers to prevent double-counting in financial tables
    console.log('Disabling triggers...');
    await client.query('SET session_replication_role = replica');
    
    // =============================================
    // 1. ACCOUNTS (wallets)
    // =============================================
    console.log('Migrating accounts...');
    const accounts = [
      { id: '93f11d4f-67a9-4131-97f9-ad9da6f9e9ed', name: 'Staff Salary', type: 'expense', balance: 0 },
      { id: '3f7e0fbd-faa6-43c5-8c8c-3735b2275677', name: 'Package Sales', type: 'income', balance: 0 },
      { id: '7366c5de-7bd5-422f-aa3d-17103eb8420b', name: 'Visa Service', type: 'income', balance: 0 },
      { id: '363407c8-0936-4631-b932-52fbede0a98a', name: 'Ticket Service', type: 'income', balance: 0 },
      { id: '2d8daa74-6997-4921-98e1-cb5af99f5f69', name: 'Hotel Service', type: 'income', balance: 0 },
      { id: '28b1c849-8041-4417-ab08-5d67686be0b8', name: 'Air Ticket Purchase', type: 'expense', balance: 0 },
      { id: '35daec71-3048-4d34-9ae9-ca80722d707e', name: 'Hotel Cost', type: 'expense', balance: 0 },
      { id: '82aab31f-69a9-490b-bb07-d01303dc93fe', name: 'Visa Processing Cost', type: 'expense', balance: 0 },
      { id: '505525cf-8950-47ba-9f49-82d6f709f9ba', name: 'Transport Cost', type: 'expense', balance: 0 },
      { id: 'cc3e7184-2dea-428b-b781-df7726c7cd62', name: 'Office Expense', type: 'expense', balance: 0 },
      { id: '0ee2f812-c566-4199-b918-0248027f90fc', name: 'Marketing Expense', type: 'expense', balance: 0 },
      { id: 'b1706c96-bffd-4edf-b485-04e3ee7c72cd', name: 'Bank', type: 'asset', balance: 0 },
      { id: '0f8423ff-b90e-4306-85f5-85ae02fd1e1b', name: 'Cash', type: 'asset', balance: 0 },
      { id: '94d3b68a-b9f1-4f0b-b088-e0eda4aa80f2', name: 'Nagad', type: 'asset', balance: 0 },
      { id: '5a218533-57b6-4004-b41c-08bc7c03c5fa', name: 'bKash', type: 'asset', balance: 0 },
      { id: '342f1517-265b-4adc-9991-154ba2635763', name: 'Revenue', type: 'income', balance: 11104499 },
      { id: 'bb957f29-9f0d-418b-a9e3-945c10bb849e', name: 'Operating Expenses', type: 'expense', balance: 16000 },
    ];
    for (const a of accounts) {
      await client.query(
        `INSERT INTO accounts (id, name, type, balance) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
        [a.id, a.name, a.type, a.balance]
      );
    }

    // =============================================
    // 2. INSTALLMENT PLANS
    // =============================================
    console.log('Migrating installment plans...');
    const plans = [
      { id: 'c3f32553-039a-4ab9-b8c6-a3d05d1b6b68', name: '3-Month Plan', description: 'Pay in 3 equal monthly installments', num_installments: 3 },
      { id: 'f93f2ee6-c216-4500-8571-6618557d705c', name: '6-Month Plan', description: 'Pay in 6 equal monthly installments', num_installments: 6 },
      { id: 'a139b837-0f0c-4c33-be0f-162e2baad72c', name: '12-Month Plan', description: 'Pay in 12 equal monthly installments', num_installments: 12 },
    ];
    for (const p of plans) {
      await client.query(
        `INSERT INTO installment_plans (id, name, description, num_installments) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.description, p.num_installments]
      );
    }

    // =============================================
    // 3. PACKAGES
    // =============================================
    console.log('Migrating packages...');
    const packages = [
      { id: '1d1066c8-ba88-43f0-b639-71c992f14b8c', name: 'Umrah Economy', type: 'umrah', price: 140000, description: 'Affordable Hajj package with essential services', duration_days: 14, start_date: '2026-03-23', show_on_website: true, is_active: true, status: 'active', features: JSON.stringify(['5-star hotel in Makkah', '3-star hotel in Madinah', 'Ground transport', 'Guided Ziyara']), services: JSON.stringify(['ভিসা', 'টিকিট', 'হোটেল']), image_url: null },
      { id: '35ad8974-a0a3-4962-88b1-0c35706213bd', name: 'Umrah Premium', type: 'umrah', price: 150000, description: 'Premium Hajj experience with top-tier amenities', duration_days: 14, start_date: '2026-03-23', show_on_website: true, is_active: true, status: 'active', features: JSON.stringify(['5-star hotel near Haram', '5-star hotel in Madinah', 'VIP transport', 'Full Ziyara tours', 'Laundry service']), services: JSON.stringify([]), image_url: null },
      { id: '23445674-5b8c-48bd-931a-de51b3dfbfe2', name: 'Transit Flight', type: 'umrah', price: 130000, description: 'Exclusive VIP Hajj package with luxury services', duration_days: 14, start_date: '0026-03-23', show_on_website: true, is_active: true, status: 'active', features: JSON.stringify([]), services: JSON.stringify([]), image_url: null },
      { id: 'c87d8bf1-7e81-4739-8f8d-a75a74658318', name: 'Umrah Child Package -1', type: 'umrah', price: 115000, description: '- Age : above 5 years', duration_days: 14, start_date: '2026-03-23', show_on_website: true, is_active: true, status: 'active', features: JSON.stringify([]), services: JSON.stringify([]), image_url: null },
      { id: 'b615f2a3-4622-4d3c-bc2f-170a1f78869e', name: 'Umrah Infant Package', type: 'umrah', price: 100000, description: null, duration_days: 14, start_date: '2026-03-23', show_on_website: true, is_active: true, status: 'active', features: JSON.stringify([]), services: JSON.stringify(['ভিসা টিকিট হোটেল']), image_url: null },
      { id: '7f1462ba-3be4-419c-a440-abeccaefad4a', name: 'Umrah Child package', type: 'umrah', price: 130000, description: null, duration_days: 14, start_date: '0206-03-23', show_on_website: true, is_active: true, status: 'active', features: JSON.stringify([]), services: JSON.stringify(['Visa Tiket Hotel']), image_url: null },
      { id: 'a11420e2-9d4b-48c1-a604-3bdadb59e544', name: 'Umrah Economy', type: 'umrah', price: 140000, description: null, duration_days: 14, start_date: '2026-03-23', show_on_website: true, is_active: true, status: 'active', features: JSON.stringify([]), services: JSON.stringify(['Visa Ticket Hotel']), image_url: null },
      { id: 'fa43dddb-a7e3-47cd-b9da-cda7f3888b20', name: 'UMRAH ECONOMY', type: 'umrah', price: 145000, description: null, duration_days: 14, start_date: '0206-03-23', show_on_website: true, is_active: true, status: 'active', features: JSON.stringify([]), services: JSON.stringify([]), image_url: null },
      { id: '9547868e-d3f4-4b27-bda8-1b9bb8138212', name: 'Hajj Packages', type: 'hajj', price: 750000, description: null, duration_days: 35, start_date: '2026-04-10', show_on_website: true, is_active: true, status: 'active', features: JSON.stringify([]), services: JSON.stringify([]), image_url: null },
      { id: '89b73dd4-9ac5-4e7a-ae92-21de86ec1e0e', name: 'Hajj Packages', type: 'hajj', price: 580000, description: null, duration_days: 35, start_date: '2026-04-10', show_on_website: true, is_active: true, status: 'active', features: JSON.stringify([]), services: JSON.stringify([]), image_url: null },
      { id: '63b6503d-3ede-40e7-8b90-cc5bfeb8f891', name: 'Hajj Child Package', type: 'hajj', price: 400000, description: null, duration_days: 35, start_date: '2026-04-10', show_on_website: true, is_active: true, status: 'active', features: JSON.stringify([]), services: JSON.stringify([]), image_url: null },
    ];
    for (const p of packages) {
      await client.query(
        `INSERT INTO packages (id, name, type, price, description, duration_days, start_date, show_on_website, is_active, status, features, services, image_url) 
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.type, p.price, p.description, p.duration_days, p.start_date, p.show_on_website, p.is_active, p.status, p.features, p.services, p.image_url]
      );
    }

    // =============================================
    // 4. SUPPLIER AGENTS
    // =============================================
    console.log('Migrating supplier agents...');
    const suppliers = [
      { id: 'e031806b-0ab1-47a9-89dc-91d5f4508b2d', agent_name: 'শরীফ এজেন্ট', contracted_amount: 7000000, contracted_hajji: 15, status: 'deleted', contract_date: '2026-03-05' },
      { id: '987d60e2-0544-4098-8845-231c32c76fc2', agent_name: 'Momen', contracted_amount: 700000, contracted_hajji: 11, status: 'deleted', contract_date: null },
      { id: '8cd79710-b5f2-41c0-a02d-1cad56bde625', agent_name: 'AL-AMIN', company_name: 'AMIN TRABEALS', address: 'RAHMANIABA COMPLEX', phone: '01781279734', contracted_amount: 2096820, contracted_hajji: 86, status: 'active', contract_date: '0206-03-23' },
    ];
    for (const s of suppliers) {
      await client.query(
        `INSERT INTO supplier_agents (id, agent_name, company_name, address, phone, contracted_amount, contracted_hajji, status, contract_date) 
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [s.id, s.agent_name, s.company_name || null, s.address || null, s.phone || null, s.contracted_amount, s.contracted_hajji, s.status, s.contract_date]
      );
    }

    // =============================================
    // 5. MOALLEMS
    // =============================================
    console.log('Migrating moallems...');
    await client.query(
      `INSERT INTO moallems (id, name, phone, address, contract_date, contracted_hajji, contracted_amount, total_deposit, total_due, status, notes) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
      ['c3843c19-c516-47ac-890d-597dfc6f7999', 'JAHID HASAN', '01912321353', 'Mymansingh', '2026-03-23', 12, 2680000, 1159000, 0, 'active',
       'তিন মাসের ভিসা দুইটি (৩৫০০০০×২)=৭০০০০ হাজার টাকা করে এবং ২৩/২/২৬ এর দুইজন হাজী (১৬৫০০০×২)=৩৩০০০০ টাকা এবং ২৩/৩/২৬ এর হাজী ১২ জন (১৪০০০০×১২)@১৬৮০০০০ টাকা করে এবং ২০ টি ভিসা (৩০০০০×২০) ৬০০০০০ টাকা']
    );

    // =============================================
    // 6. USERS (placeholder entries for customer user_ids)
    // =============================================
    console.log('Creating placeholder user entries...');
    const userIds = [
      '81b6e43b-4c5b-4494-aa9f-9198ad2c9bd5', 'a0948375-9a3d-424c-86b4-4fedc17c4d6e',
      'f863de99-a47c-4023-ab97-615ea60ad7c2', 'f2c2847e-58f4-42a6-a794-81804e47fe4a',
      '26d15118-9950-444f-b0f7-db020d03c350', '848e04f8-f0e5-4541-adf6-d7d39559a46d',
      '501928d5-7eb3-41ae-9885-0f5c1af737d3', '1790edab-7992-4bb3-bd39-90ea55fbd400',
      '53e6ce1e-5a76-4979-ae72-7a506051c7f7', 'b830e16b-0aec-4550-b777-d574e644b25f',
      'c143e14b-3510-4141-aa5b-e39421c15c57', 'c3f397ae-7039-464c-97d5-957301c63787',
      'a8d3f311-4075-4352-8e3a-dfd670852755', '1692e923-ddb2-4879-b2f6-2b940d23653e',
      '4e59ab90-6b67-4ac8-b527-d5894eb3f889', '40dc6a7b-2f71-405f-84f1-f2b96c0e9d0b',
      '79d68c7f-96cf-49db-a7cb-ea4cb83d9cbe', '937515a2-6747-445b-b4ab-85b0aef4097e',
      '87fa5849-3e67-4603-8b91-637924e6bc45', '229264b4-2acc-4409-b837-daadcacc19b7',
      '50623843-31d6-4100-bba0-c7fc8fa624d3', '3d72cff4-ef77-4a61-94e8-9f2cb8f2d4d5',
      '171dcda9-41cd-47f6-8287-6ca204c758c1', '35fddecc-cf83-45ee-bc2e-ac25c2cbb760',
      '44657d7c-25bc-446f-846d-73701d404874', '269c1e11-3461-4b01-99f5-fe22cd0278d6',
    ];
    for (const uid of userIds) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, full_name) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
        [uid, `customer-${uid.substring(0,8)}@placeholder.local`, '$2a$10$placeholder', `Customer ${uid.substring(0,8)}`]
      );
    }

    // =============================================
    // 7. PROFILES
    // =============================================
    console.log('Migrating profiles...');
    const profiles = [
      { id: 'aa96ad4c-927c-46bd-8157-6bbab1e507da', user_id: '81b6e43b-4c5b-4494-aa9f-9198ad2c9bd5', full_name: 'MD MASUD MIAH', email: 'rahekaba@gmail.com', phone: '01841482930', address: 'GAZARIA.RASULPUR', date_of_birth: '2026-02-02', passport_number: 'A14496044', emergency_contact: '01841482930' },
      { id: '1fd5538d-9be2-4bbf-b963-d36830efa59e', user_id: 'a0948375-9a3d-424c-86b4-4fedc17c4d6e', full_name: 'MD MUSTAFA', email: 'rahekaba@gmail.com', phone: '01853227152', address: 'NARAYANGANJ', date_of_birth: '1964-01-15', passport_number: 'A21065775', emergency_contact: '01853227152' },
      { id: 'ccee7084-4965-4ee2-b10a-55862016936f', user_id: 'f863de99-a47c-4023-ab97-615ea60ad7c2', full_name: 'MD.SAIFUL ISLAM', email: 'rahekaba@gmail.com', phone: '01718127796', address: 'BORO MAGHBAZAR', date_of_birth: '1984-11-28', passport_number: 'A19566553' },
      { id: '2ba3a37a-c9f9-48c0-938e-6f5ffbc68d00', user_id: 'f2c2847e-58f4-42a6-a794-81804e47fe4a', full_name: 'MD SOHEL', phone: '01919181378', address: 'NARAYANGANJ', date_of_birth: '1986-07-18', passport_number: 'A05809404' },
      { id: 'f0a05348-bc17-45e5-97e4-41884fd20df1', user_id: '26d15118-9950-444f-b0f7-db020d03c350', full_name: 'UZZAL', email: 'rahekaba@gmail.com', phone: '01912586722', address: 'TARABO', date_of_birth: '1992-02-21', passport_number: 'A19655084' },
      { id: '65f45e08-20d8-43a8-a1ff-262f71231136', user_id: '848e04f8-f0e5-4541-adf6-d7d39559a46d', full_name: 'BALAYET HOSSAIN', email: 'rahekaba@gmail.com', phone: '01728161488', address: 'CUMMILA', date_of_birth: '1990-01-01', passport_number: 'A01423373' },
      { id: '2accf393-8312-40f4-bbbd-202a0c48388f', user_id: '501928d5-7eb3-41ae-9885-0f5c1af737d3', full_name: 'MD WALI ULLAH', email: 'rahekaba@gmail.com', phone: '01786118687', address: 'ARAIHAZAR', date_of_birth: '1988-10-28', passport_number: 'A21581557' },
      { id: '2401d33a-6d98-4193-9f80-1c034a6d5c6b', user_id: '1790edab-7992-4bb3-bd39-90ea55fbd400', full_name: 'MD FAJLUL HAQ', email: 'rahekaba@gmail.com', phone: '01822050778', address: 'KORBANPOR', date_of_birth: '1976-07-10', passport_number: 'A21235772' },
      { id: '72eee9de-293b-4938-8ca1-089304c17f56', user_id: '53e6ce1e-5a76-4979-ae72-7a506051c7f7', full_name: 'MD IBRAHIM MIAH (SI)', email: 'rahekaba@gmail.com', phone: '01778853238', address: 'NARSINGDI', date_of_birth: '1983-10-10', passport_number: 'A01427097' },
      { id: 'bd0f9a5c-f552-4160-81ec-165fb0bb8cd8', user_id: 'b830e16b-0aec-4550-b777-d574e644b25f', full_name: 'MST AMINA KHATON (SUKKR)', email: 'rahekaba@gmail.com', phone: '01857734341', address: 'NUNERTEK', date_of_birth: '1958-06-12', passport_number: 'A18543506' },
      { id: '8799e1cd-2879-4c2f-81ac-bbc0c2a2af01', user_id: 'c143e14b-3510-4141-aa5b-e39421c15c57', full_name: 'MOHAMMAD MOJIBUR RAHMAN BHUIYAN (AL-AMIN)', email: 'rahekaba@gmail.com', phone: '01916597032', address: 'KAZIPARA', date_of_birth: '1975-08-11', passport_number: 'A19093531' },
      { id: '4efdf090-121e-44a4-8b17-6a9f1778ac3e', user_id: 'c3f397ae-7039-464c-97d5-957301c63787', full_name: 'MD ASHRAF ALI', email: 'rahekaba@gmail.com', phone: '01917558512', address: 'MEGHNA', date_of_birth: '1958-05-20', passport_number: 'A17694350' },
      { id: '22be7f55-6ed4-4ec0-b37f-f0da1594440a', user_id: 'a8d3f311-4075-4352-8e3a-dfd670852755', full_name: 'BULU MIA', email: 'rahekaba@gmail.com', phone: '01716856010', address: 'SONARGAON', date_of_birth: '1960-05-24', passport_number: 'A21581591' },
    ];
    // Add remaining profiles
    const moreProfiles = [
      { user_id: '79d68c7f-96cf-49db-a7cb-ea4cb83d9cbe', full_name: 'MD MOHIUDDIN', email: 'rahekaba@gmail.com', phone: '01911340594', address: 'UTTORA', passport_number: 'A15927430' },
      { user_id: '937515a2-6747-445b-b4ab-85b0aef4097e', full_name: 'MOHAMMAD GOLAM MORSHED', email: 'rahekaba@gmail.com', phone: '01718356419', address: 'BARO MOGHBAZAR', passport_number: 'A11136834' },
      { user_id: '87fa5849-3e67-4603-8b91-637924e6bc45', full_name: 'MD GAIS UDDIN', email: 'rahekaba@gmail.com', phone: '01676264710', address: 'KADOMTALI', passport_number: 'A21054815' },
      { user_id: '229264b4-2acc-4409-b837-daadcacc19b7', full_name: 'ABDUL WASHAK', email: 'rahekaba@gmail.com', phone: '01732399403', address: 'CUMLLIA', passport_number: 'A21713360' },
      { user_id: '50623843-31d6-4100-bba0-c7fc8fa624d3', full_name: 'SYEDA SADIA JAHAN', email: 'rahekaba@gmail.com', phone: '01984545655', address: 'SONARGAON', passport_number: 'A04809370' },
      { user_id: '3d72cff4-ef77-4a61-94e8-9f2cb8f2d4d5', full_name: 'MOHAMMAD JASIM UDDIN', email: 'rahekaba@gmail.com', phone: '01819474802', address: 'Narayanganj', passport_number: 'A06256598' },
      { user_id: '171dcda9-41cd-47f6-8287-6ca204c758c1', full_name: 'ALI-HAYDER', email: 'rahekaba@gmail.com', phone: '01922484307', address: 'MODONDHANGA BAZAR', passport_number: 'A10957404' },
      { user_id: '35fddecc-cf83-45ee-bc2e-ac25c2cbb760', full_name: 'GAZI UR RAHMAN', email: 'rahekaba@gmail.com', phone: '01814983264', address: 'HORIPURM', passport_number: 'A16493628' },
      { user_id: '44657d7c-25bc-446f-846d-73701d404874', full_name: 'ABDUR RASHID', email: 'rahekaba@gmail.com', phone: '01919268036', address: 'HORIPUR', passport_number: 'A20124814' },
      { user_id: '269c1e11-3461-4b01-99f5-fe22cd0278d6', full_name: 'MD BAZLUR RAHMAN', phone: '01810455928', address: 'HORIPUR', passport_number: 'A20233232' },
    ];
    
    for (const p of profiles) {
      await client.query(
        `INSERT INTO profiles (id, user_id, full_name, email, phone, address, date_of_birth, passport_number, emergency_contact) 
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.user_id, p.full_name, p.email || null, p.phone || null, p.address || null, p.date_of_birth || null, p.passport_number || null, p.emergency_contact || null]
      );
    }
    for (const p of moreProfiles) {
      await client.query(
        `INSERT INTO profiles (user_id, full_name, email, phone, address, passport_number) 
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [p.user_id, p.full_name, p.email || null, p.phone || null, p.address || null, p.passport_number || null]
      );
    }

    // =============================================
    // 8. BOOKINGS
    // =============================================
    console.log('Migrating bookings...');
    const bookings = [
      { id:'6a8b863e-f3a2-4a00-b1fe-ba024241dfe9', tracking_id:'RK-94C1DD85', user_id:'81b6e43b-4c5b-4494-aa9f-9198ad2c9bd5', package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd', booking_type:'family', num_travelers:5, total_amount:750000, paid_amount:520000, due_amount:230000, selling_price_per_person:150000, status:'confirmed', guest_name:'MD MASUD MIAH', guest_phone:'01841482930', guest_email:'rahekaba@gmail.com', guest_passport:'A14496044', guest_address:'GAZARIA.RASULPUR', notes:'Full Package', profit_amount:750000 },
      { id:'24bef603-1b47-4d41-8b4d-7ec25b7503d2', tracking_id:'RK-5918384C', user_id:'a0948375-9a3d-424c-86b4-4fedc17c4d6e', package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544', booking_type:'family', num_travelers:2, total_amount:280000, paid_amount:0, due_amount:280000, selling_price_per_person:140000, status:'confirmed', guest_name:'MD MUSTAFA', guest_phone:'01853227152', guest_email:'rahekaba@gmail.com', guest_passport:'A21065775', guest_address:'NARAYANGANJ', profit_amount:280000 },
      { id:'8458480d-6249-48b4-8e8b-0e57a432e736', tracking_id:'RK-1372EBE2', user_id:'f863de99-a47c-4023-ab97-615ea60ad7c2', package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544', booking_type:'family', num_travelers:2, total_amount:280000, paid_amount:200000, due_amount:80000, status:'confirmed', guest_name:'MD.SAIFUL ISLAM', guest_phone:'01718127796', guest_email:'rahekaba@gmail.com', guest_passport:'A19566553', guest_address:'BORO MAGHBAZAR', profit_amount:280000 },
      { id:'6c61c196-38a3-4f10-a85e-1fc0f2688977', tracking_id:'RK-5D78F468', user_id:'f2c2847e-58f4-42a6-a794-81804e47fe4a', package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd', booking_type:'family', num_travelers:5, total_amount:695000, paid_amount:500000, due_amount:195000, status:'confirmed', guest_name:'MD SOHEL', guest_phone:'01919181378', guest_address:'NARAYANGANJ', profit_amount:695000 },
      { id:'82d2520a-2b55-48a8-91b4-d233337e7e50', tracking_id:'RK-66F9D7FC', user_id:'26d15118-9950-444f-b0f7-db020d03c350', package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544', booking_type:'family', num_travelers:3, total_amount:420000, paid_amount:0, due_amount:420000, status:'confirmed', guest_name:'UZZAL', guest_phone:'01912586722', guest_email:'rahekaba@gmail.com', guest_passport:'A19655084', guest_address:'TARABO', profit_amount:420000 },
      { id:'76909775-f712-4434-b8a5-820a598f8e08', tracking_id:'RK-37F14BD6', user_id:'848e04f8-f0e5-4541-adf6-d7d39559a46d', package_id:'7f1462ba-3be4-419c-a440-abeccaefad4a', booking_type:'family', num_travelers:3, total_amount:400000, paid_amount:300000, due_amount:100000, status:'confirmed', guest_name:'BALAYET HOSSAIN', guest_phone:'01728161488', guest_email:'rahekaba@gmail.com', guest_passport:'A01423373', guest_address:'CUMMILA', profit_amount:400000 },
      { id:'5e1b7980-1af5-47aa-a291-3fe784da30f9', tracking_id:'RK-4D1ACFF8', user_id:'501928d5-7eb3-41ae-9885-0f5c1af737d3', package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544', booking_type:'family', num_travelers:2, total_amount:280000, paid_amount:180000, due_amount:100000, status:'confirmed', guest_name:'MD WALI ULLAH', guest_phone:'01786118687', guest_email:'rahekaba@gmail.com', guest_passport:'A21581557', guest_address:'ARAIHAZAR', profit_amount:280000 },
      { id:'1849586e-7bba-4af3-b5ab-a77e47e63836', tracking_id:'RK-36A453F9', user_id:'1790edab-7992-4bb3-bd39-90ea55fbd400', package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c', booking_type:'family', num_travelers:2, total_amount:280000, paid_amount:130000, due_amount:150000, status:'confirmed', guest_name:'MD FAJLUL HAQ', guest_phone:'01822050778', guest_email:'rahekaba@gmail.com', guest_passport:'A21235772', guest_address:'KORBANPOR', profit_amount:280000 },
      { id:'ab771139-190a-4ce2-863f-16d7ea956fdc', tracking_id:'RK-5FB91FB3', user_id:'53e6ce1e-5a76-4979-ae72-7a506051c7f7', package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544', booking_type:'family', num_travelers:2, total_amount:280000, paid_amount:250000, due_amount:30000, status:'confirmed', guest_name:'MD IBRAHIM MIAH (SI)', guest_phone:'01778853238', guest_email:'rahekaba@gmail.com', guest_passport:'A01427097', guest_address:'NARSINGDI', profit_amount:280000 },
      { id:'1c6f617a-f9b3-455f-b5d3-0db5a73adae1', tracking_id:'RK-C0E5CD9C', user_id:'b830e16b-0aec-4550-b777-d574e644b25f', package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544', booking_type:'family', num_travelers:2, total_amount:280000, paid_amount:174000, due_amount:106000, selling_price_per_person:140000, status:'completed', guest_name:'MST AMINA KHATON (SUKKR)', guest_phone:'01857734341', guest_email:'rahekaba@gmail.com', guest_passport:'A18543506', guest_address:'NUNERTEK', profit_amount:280000 },
      { id:'06e43a5b-475a-4c43-97b2-f54a365170a0', tracking_id:'RK-A6189FC2', user_id:'c143e14b-3510-4141-aa5b-e39421c15c57', package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544', booking_type:'family', num_travelers:5, total_amount:725000, paid_amount:720000, due_amount:5000, selling_price_per_person:145000, status:'completed', guest_name:'MOHAMMAD MOJIBUR RAHMAN BHUIYAN (AL-AMIN)', guest_phone:'01916597032', guest_email:'rahekaba@gmail.com', guest_passport:'A19093531', guest_address:'KAZIPARA', profit_amount:725000 },
      { id:'f790bf71-1064-4901-a774-6e47e52c8326', tracking_id:'RK-74C715AD', user_id:'c3f397ae-7039-464c-97d5-957301c63787', package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c', booking_type:'individual', num_travelers:2, total_amount:280000, paid_amount:50000, due_amount:230000, selling_price_per_person:140000, status:'confirmed', guest_name:'MD ASHRAF ALI', guest_phone:'01917558512', guest_email:'rahekaba@gmail.com', guest_passport:'A17694350', guest_address:'MEGHNA', profit_amount:280000 },
      { id:'0ff0ef2e-3f37-4ea0-94c6-f3655bbcd703', tracking_id:'RK-EBDE1489', user_id:'a8d3f311-4075-4352-8e3a-dfd670852755', package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c', booking_type:'family', num_travelers:1, total_amount:140000, paid_amount:50000, due_amount:90000, status:'confirmed', guest_name:'BULU MIA', guest_phone:'01716856010', guest_email:'rahekaba@gmail.com', guest_passport:'A21581591', guest_address:'SONARGAON', profit_amount:140000 },
      { id:'5e9f2854-8a46-4ed1-bb91-d8e9aef99c3d', tracking_id:'RK-BEB6486E', user_id:'79d68c7f-96cf-49db-a7cb-ea4cb83d9cbe', package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd', booking_type:'family', num_travelers:7, total_amount:1000000, paid_amount:700000, due_amount:300000, status:'confirmed', guest_name:'MD MOHIUDDIN', guest_phone:'01911340594', guest_email:'rahekaba@gmail.com', guest_passport:'A15927430', guest_address:'UTTORA', profit_amount:1000000 },
      { id:'4a34a947-6fb1-4c24-9206-21b04cf66e55', tracking_id:'RK-5E156726', user_id:'937515a2-6747-445b-b4ab-85b0aef4097e', package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c', booking_type:'family', num_travelers:4, total_amount:560000, paid_amount:400000, due_amount:160000, status:'confirmed', guest_name:'MOHAMMAD GOLAM MORSHED', guest_phone:'01718356419', guest_email:'rahekaba@gmail.com', guest_passport:'A11136834', guest_address:'BARO MOGHBAZAR', profit_amount:560000 },
      { id:'3e934a0e-34d2-4172-b418-76a8ac8d56d0', tracking_id:'RK-485FE1AD', user_id:'87fa5849-3e67-4603-8b91-637924e6bc45', package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c', booking_type:'family', num_travelers:2, total_amount:280000, paid_amount:280000, due_amount:0, status:'completed', guest_name:'MD GAIS UDDIN', guest_phone:'01676264710', guest_email:'rahekaba@gmail.com', guest_passport:'A21054815', guest_address:'KADOMTALI', profit_amount:280000 },
      { id:'58f4716a-e710-4a3f-8cab-b52c279ae7b9', tracking_id:'RK-0BE627DB', user_id:'229264b4-2acc-4409-b837-daadcacc19b7', package_id:'23445674-5b8c-48bd-931a-de51b3dfbfe2', booking_type:'family', num_travelers:2, total_amount:280000, paid_amount:0, due_amount:280000, selling_price_per_person:140000, status:'confirmed', guest_name:'ABDUL WASHAK', guest_phone:'01732399403', guest_email:'rahekaba@gmail.com', guest_passport:'A21713360', guest_address:'CUMLLIA', profit_amount:280000 },
      { id:'3cbe8441-0cbb-4c7b-a7ad-56f47d791ed4', tracking_id:'RK-7187790E', user_id:'50623843-31d6-4100-bba0-c7fc8fa624d3', package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c', booking_type:'family', num_travelers:3, total_amount:420000, paid_amount:360500, due_amount:59500, selling_price_per_person:140000, status:'confirmed', guest_name:'SYEDA SADIA JAHAN', guest_phone:'01984545655', guest_email:'rahekaba@gmail.com', guest_passport:'A04809370', guest_address:'SONARGAON', profit_amount:420000 },
      { id:'9de8a3b6-565b-499c-8b71-fc139981c52f', tracking_id:'RK-6C05C45D', user_id:'3d72cff4-ef77-4a61-94e8-9f2cb8f2d4d5', package_id:'9547868e-d3f4-4b27-bda8-1b9bb8138212', booking_type:'family', num_travelers:2, total_amount:1440002, paid_amount:1200000, due_amount:240002, status:'confirmed', guest_name:'MOHAMMAD JASIM UDDIN', guest_phone:'01819474802', guest_email:'rahekaba@gmail.com', guest_passport:'A06256598', guest_address:'Narayanganj', profit_amount:1440002 },
      { id:'6a2301d7-9751-4509-9c2b-743d4e5eff4b', tracking_id:'RK-2328084D', user_id:'171dcda9-41cd-47f6-8287-6ca204c758c1', package_id:'9547868e-d3f4-4b27-bda8-1b9bb8138212', booking_type:'individual', num_travelers:1, total_amount:580000, paid_amount:200000, due_amount:380000, selling_price_per_person:580000, discount:30000, status:'confirmed', guest_name:'ALI-HAYDER', guest_phone:'01922484307', guest_email:'rahekaba@gmail.com', guest_passport:'A10957404', guest_address:'MODONDHANGA BAZAR', profit_amount:580000 },
      { id:'9dab1ef9-1dcf-4252-ba43-ab4dd49f1192', tracking_id:'RK-06C6E610', user_id:'35fddecc-cf83-45ee-bc2e-ac25c2cbb760', package_id:'89b73dd4-9ac5-4e7a-ae92-21de86ec1e0e', booking_type:'individual', num_travelers:1, total_amount:580000, paid_amount:560000, due_amount:20000, selling_price_per_person:580000, discount:20000, status:'completed', guest_name:'GAZI UR RAHMAN', guest_phone:'01814983264', guest_email:'rahekaba@gmail.com', guest_passport:'A16493628', guest_address:'HORIPURM', profit_amount:580000 },
      { id:'11f5a9d3-f7c3-4c81-af08-c90058cb0036', tracking_id:'RK-D5A31F53', user_id:'44657d7c-25bc-446f-846d-73701d404874', package_id:'89b73dd4-9ac5-4e7a-ae92-21de86ec1e0e', booking_type:'individual', num_travelers:1, total_amount:580000, paid_amount:530000, due_amount:50000, selling_price_per_person:580000, discount:20000, status:'confirmed', guest_name:'ABDUR RASHID', guest_phone:'01919268036', guest_email:'rahekaba@gmail.com', guest_passport:'A20124814', guest_address:'HORIPUR', profit_amount:580000 },
      { id:'9013a0b5-86e9-4f50-9846-277f4afb624e', tracking_id:'RK-7C2F3315', user_id:'269c1e11-3461-4b01-99f5-fe22cd0278d6', package_id:'89b73dd4-9ac5-4e7a-ae92-21de86ec1e0e', booking_type:'individual', num_travelers:1, total_amount:580000, paid_amount:530000, due_amount:50000, selling_price_per_person:580000, discount:20000, status:'confirmed', guest_name:'MD BAZLUR RAHMAN', guest_phone:'01810455928', guest_passport:'A20233232', guest_address:'HORIPUR', profit_amount:580000 },
    ];
    
    for (const b of bookings) {
      await client.query(
        `INSERT INTO bookings (id, tracking_id, user_id, package_id, booking_type, num_travelers, total_amount, paid_amount, due_amount, selling_price_per_person, discount, status, guest_name, guest_phone, guest_email, guest_passport, guest_address, notes, profit_amount, cost_price_per_person, total_cost, total_commission, commission_per_person, commission_paid, commission_due, extra_expense, moallem_due, paid_by_moallem, supplier_due, paid_to_supplier) 
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,0,0,0,0,0,0,0,0,0,0,0) ON CONFLICT (id) DO NOTHING`,
        [b.id, b.tracking_id, b.user_id, b.package_id, b.booking_type, b.num_travelers, b.total_amount, b.paid_amount, b.due_amount, b.selling_price_per_person || 0, b.discount || 0, b.status, b.guest_name, b.guest_phone || null, b.guest_email || null, b.guest_passport || null, b.guest_address || null, b.notes || null, b.profit_amount]
      );
    }

    // =============================================
    // 9. BOOKING MEMBERS - using raw SQL from data
    // =============================================
    console.log('Migrating booking members...');
    const members = [
      // Booking RK-94C1DD85
      {id:'fedda9d9-3b6f-4c90-bbb5-898c12d7291c',booking_id:'6a8b863e-f3a2-4a00-b1fe-ba024241dfe9',full_name:'MD MASUD MIAH',passport_number:'A14496044',package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd',selling_price:150000,discount:0,final_price:150000},
      {id:'31b14e87-8d78-4165-9a23-4105cf7f0960',booking_id:'6a8b863e-f3a2-4a00-b1fe-ba024241dfe9',full_name:'KAMINI BEGUM',passport_number:'A19034033',package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd',selling_price:150000,discount:0,final_price:150000},
      {id:'57156569-a28f-41fe-9625-d8daf9c1083a',booking_id:'6a8b863e-f3a2-4a00-b1fe-ba024241dfe9',full_name:'SHEFALY BEGUM',passport_number:'A19041739',package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd',selling_price:150000,discount:0,final_price:150000},
      {id:'4e1d27b2-733b-4cc0-b3d4-715375f90e53',booking_id:'6a8b863e-f3a2-4a00-b1fe-ba024241dfe9',full_name:'DILARA KHAN',passport_number:'A09753984',package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd',selling_price:150000,discount:0,final_price:150000},
      {id:'f6868ff8-4fd6-4d3e-8152-63ca054f20dc',booking_id:'6a8b863e-f3a2-4a00-b1fe-ba024241dfe9',full_name:'AKLIMA BEGUM',passport_number:'A20260576',package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd',selling_price:150000,discount:0,final_price:150000},
      // Booking RK-5918384C
      {id:'78c07352-c3f2-4504-8e60-a72929db2fdc',booking_id:'24bef603-1b47-4d41-8b4d-7ec25b7503d2',full_name:'MD MUSTAFA',passport_number:'A21065775',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'e6dd9bf9-ed3f-4ef6-9775-2570c19595ac',booking_id:'24bef603-1b47-4d41-8b4d-7ec25b7503d2',full_name:'ASMA',passport_number:'A21065776',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      // Booking RK-1372EBE2
      {id:'a4084418-210a-41bc-95c5-156c3b4f6d3e',booking_id:'8458480d-6249-48b4-8e8b-0e57a432e736',full_name:'MD.SAIFUL ISLAM',passport_number:'A19566553',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'e9d4e7fa-e1d8-49fc-9647-567f5514e2da',booking_id:'8458480d-6249-48b4-8e8b-0e57a432e736',full_name:'MST RASHIDA BEGUM',passport_number:'A15663630',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      // Booking RK-5D78F468
      {id:'734801b0-5282-40bd-abb5-94ddbfda3ea1',booking_id:'6c61c196-38a3-4f10-a85e-1fc0f2688977',full_name:'MD SOHEL',passport_number:'A05809404',package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd',selling_price:150000,discount:0,final_price:150000},
      {id:'a85fdc4a-ecbb-4fee-af17-3576b1a09a94',booking_id:'6c61c196-38a3-4f10-a85e-1fc0f2688977',full_name:'FAIZAN AHMAD',passport_number:'A19759720',package_id:'c87d8bf1-7e81-4739-8f8d-a75a74658318',selling_price:115000,discount:0,final_price:115000},
      {id:'db86dee0-9db0-4883-8002-90ea242f77c5',booking_id:'6c61c196-38a3-4f10-a85e-1fc0f2688977',full_name:'MST FATEMA AKTER',passport_number:'A19634170',package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd',selling_price:150000,discount:0,final_price:150000},
      {id:'e4f5a0fb-7175-4f55-b4b6-655d93d43464',booking_id:'6c61c196-38a3-4f10-a85e-1fc0f2688977',full_name:'MST SHIKHA',passport_number:'A05809448',package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd',selling_price:150000,discount:0,final_price:150000},
      {id:'2b3da15c-47a0-4e31-8791-c8c24acfc44b',booking_id:'6c61c196-38a3-4f10-a85e-1fc0f2688977',full_name:'UMME SALMA AKTER SHARIKA',passport_number:'A19642565',package_id:'7f1462ba-3be4-419c-a440-abeccaefad4a',selling_price:130000,discount:0,final_price:130000},
      // Continue with remaining members...
      {id:'363c5c0e-b21e-41cc-ba73-8e52968ebcc6',booking_id:'82d2520a-2b55-48a8-91b4-d233337e7e50',full_name:'UZZAL',passport_number:'A19655084',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'97d372b3-6645-4ebf-9165-ea7e5636cada',booking_id:'82d2520a-2b55-48a8-91b4-d233337e7e50',full_name:'ROHIMA BEGUM',passport_number:'A15753822',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'ca9d6308-035e-4cec-bb6d-c8e553cb944c',booking_id:'82d2520a-2b55-48a8-91b4-d233337e7e50',full_name:'MST NURUNNAHAR',passport_number:'A19655031',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'eaa1a921-b4b2-440c-94ad-bb21e049b37d',booking_id:'76909775-f712-4434-b8a5-820a598f8e08',full_name:'BALAYET HOSSAIN',passport_number:'A01423373',package_id:'7f1462ba-3be4-419c-a440-abeccaefad4a',selling_price:130000,discount:0,final_price:130000},
      {id:'9aa9b6b0-d38c-40a8-9da4-32e8e4220940',booking_id:'76909775-f712-4434-b8a5-820a598f8e08',full_name:'ABDUR RASHID',passport_number:'A05762979',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'11667d57-031b-4444-93af-76d28efa0a51',booking_id:'76909775-f712-4434-b8a5-820a598f8e08',full_name:'MST ASMA AKTER',passport_number:'A20581618',package_id:'7f1462ba-3be4-419c-a440-abeccaefad4a',selling_price:130000,discount:0,final_price:130000},
      {id:'c5e2c55b-b47c-4845-93bd-9852ad632730',booking_id:'5e1b7980-1af5-47aa-a291-3fe784da30f9',full_name:'MD WALI ULLAH',passport_number:'A21581557',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'bdd8f0b1-6c06-416b-b194-6aa40f219aa1',booking_id:'5e1b7980-1af5-47aa-a291-3fe784da30f9',full_name:'MST SHAHIDA AKTER',passport_number:'A21509490',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'d7e82a92-7993-449b-b303-8e41d7f6aeb6',booking_id:'1849586e-7bba-4af3-b5ab-a77e47e63836',full_name:'MD FAJLUL HAQ',passport_number:'A21235772',package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c',selling_price:140000,discount:0,final_price:140000},
      {id:'a60a2436-e83a-4800-80d5-cfd220d5de91',booking_id:'1849586e-7bba-4af3-b5ab-a77e47e63836',full_name:'PIYARA BEGUM',passport_number:'A21235769',package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c',selling_price:140000,discount:0,final_price:140000},
      {id:'cf6c8317-000b-477b-b0c1-f53ba7dbdc76',booking_id:'ab771139-190a-4ce2-863f-16d7ea956fdc',full_name:'MD IBRAHIM MIAH (SI)',passport_number:'A01427097',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'091a1cbe-37aa-45a5-a1a5-e84a740aa28f',booking_id:'ab771139-190a-4ce2-863f-16d7ea956fdc',full_name:'MST RAZIYA KHATUN',passport_number:'A20926094',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'909587ae-de99-4857-9be1-2595d7b7bbbb',booking_id:'1c6f617a-f9b3-455f-b5d3-0db5a73adae1',full_name:': MST AMINA KHATON (SUKKR',passport_number:': A18543506',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'9925364a-6ae7-427a-8683-36f2ab8d6f75',booking_id:'1c6f617a-f9b3-455f-b5d3-0db5a73adae1',full_name:'MST MNARA BEGUM',passport_number:'A21752097',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'3fd270ed-fd27-4fb1-a429-90f3657ad350',booking_id:'06e43a5b-475a-4c43-97b2-f54a365170a0',full_name:'MOHAMMAD MOJIBUR RAHMAN BHUIYAN (AL-AMIN)',passport_number:'A19093531',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'691db4f3-50a7-4d63-b15c-dfeafefa33f4',booking_id:'06e43a5b-475a-4c43-97b2-f54a365170a0',full_name:'HASINA BEGUM',passport_number:'A21568652',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'096b8b61-a584-4b3c-95a1-3f9065a855a7',booking_id:'06e43a5b-475a-4c43-97b2-f54a365170a0',full_name:'MD ABDUL AZIZ BHUIYAN',passport_number:'A21568653',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'391a2510-99fc-4eb9-8232-4fec31071ba7',booking_id:'06e43a5b-475a-4c43-97b2-f54a365170a0',full_name:'RUPLBAN BEGUM',passport_number:'A21256687',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'e53b94cf-d637-4e75-b66c-379002530425',booking_id:'06e43a5b-475a-4c43-97b2-f54a365170a0',full_name:'SURBANU',passport_number:'A21235239',package_id:'a11420e2-9d4b-48c1-a604-3bdadb59e544',selling_price:140000,discount:0,final_price:140000},
      {id:'b105aa5a-d073-4075-8a4a-73ad981245f3',booking_id:'0ff0ef2e-3f37-4ea0-94c6-f3655bbcd703',full_name:'BULU MIA',passport_number:'A21581591',package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c',selling_price:140000,discount:0,final_price:140000},
      {id:'7c60b0ba-01dd-422f-965b-8f4c0a04ef48',booking_id:'5e9f2854-8a46-4ed1-bb91-d8e9aef99c3d',full_name:'MD MOHIUDDIN',passport_number:'A15927430',package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd',selling_price:150000,discount:0,final_price:150000},
      {id:'4d4b9216-1684-4d87-a07f-a5e3b640a0fe',booking_id:'5e9f2854-8a46-4ed1-bb91-d8e9aef99c3d',full_name:'RAJIB ANWAR',passport_number:'A03376192',package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd',selling_price:150000,discount:0,final_price:150000},
      {id:'2838e1e6-d9d3-463c-b06f-f5c8f8a67a1e',booking_id:'5e9f2854-8a46-4ed1-bb91-d8e9aef99c3d',full_name:'FAHIMA AFIRAN',passport_number:'A06831168',package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd',selling_price:150000,discount:0,final_price:150000},
      {id:'1bdc826c-606a-4453-8c72-68acbac1289c',booking_id:'5e9f2854-8a46-4ed1-bb91-d8e9aef99c3d',full_name:'IBRAHIM AL MEHRAB',passport_number:'A09798396',package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd',selling_price:150000,discount:0,final_price:150000},
      {id:'27ad2939-93dc-41fa-a6b4-41d0798f8866',booking_id:'5e9f2854-8a46-4ed1-bb91-d8e9aef99c3d',full_name:'KAWSAR AKTER',passport_number:'A12312604',package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd',selling_price:150000,discount:0,final_price:150000},
      {id:'2dd56bf2-9a7d-407e-9e56-e445d9e5bdfa',booking_id:'5e9f2854-8a46-4ed1-bb91-d8e9aef99c3d',full_name:'RIFAYA ANWAR FARHEEN',passport_number:'A06844355',package_id:'b615f2a3-4622-4d3c-bc2f-170a1f78869e',selling_price:100000,discount:0,final_price:100000},
      {id:'e0746ce9-173c-4726-9223-fb4a3cfd1eb5',booking_id:'5e9f2854-8a46-4ed1-bb91-d8e9aef99c3d',full_name:'BELI HAQUE',passport_number:'A11086087',package_id:'35ad8974-a0a3-4962-88b1-0c35706213bd',selling_price:150000,discount:0,final_price:150000},
      {id:'0043a83c-0da0-4d1e-acb2-5d55986a89d5',booking_id:'4a34a947-6fb1-4c24-9206-21b04cf66e55',full_name:'MOHAMMAD GOLAM MORSHED',passport_number:'A11136834',package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c',selling_price:140000,discount:0,final_price:140000},
      {id:'3602441e-d988-4179-ae86-bbe411890f92',booking_id:'4a34a947-6fb1-4c24-9206-21b04cf66e55',full_name:'MAJAN BINTE MORSHED',passport_number:'A05593141',package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c',selling_price:140000,discount:0,final_price:140000},
      {id:'b411c502-8517-47d0-8e77-c0a76aa8705a',booking_id:'4a34a947-6fb1-4c24-9206-21b04cf66e55',full_name:'MAHMUDA AKTER',passport_number:'A0613123',package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c',selling_price:140000,discount:0,final_price:140000},
      {id:'3f55e035-2783-4c73-832d-00643398d6aa',booking_id:'4a34a947-6fb1-4c24-9206-21b04cf66e55',full_name:'MARJIA BINTE MORSHED',passport_number:'A05593142',package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c',selling_price:140000,discount:0,final_price:140000},
      {id:'9cd10dfb-09d3-4826-af85-0f9f9b4e20cf',booking_id:'3e934a0e-34d2-4172-b418-76a8ac8d56d0',full_name:'MD GAIS UDDIN',passport_number:'A21054815',package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c',selling_price:140000,discount:0,final_price:140000},
      {id:'90419416-483c-4269-bd92-d1d82905fd8f',booking_id:'3e934a0e-34d2-4172-b418-76a8ac8d56d0',full_name:'ZOHARA BEGUM',passport_number:'A21057848',package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c',selling_price:140000,discount:0,final_price:140000},
      {id:'6d85867a-6ae9-4792-87ea-fe55c99d59c0',booking_id:'58f4716a-e710-4a3f-8cab-b52c279ae7b9',full_name:'ABDUL WASHAK',passport_number:'A21713360',package_id:'23445674-5b8c-48bd-931a-de51b3dfbfe2',selling_price:130000,discount:0,final_price:130000},
      {id:'c9b1646a-57c5-4ecb-aa9e-60d874b65e64',booking_id:'58f4716a-e710-4a3f-8cab-b52c279ae7b9',full_name:'MOMTAJ BEGUM',passport_number:'A21713359',package_id:'23445674-5b8c-48bd-931a-de51b3dfbfe2',selling_price:130000,discount:0,final_price:130000},
      {id:'d5d6da48-ed54-447d-bfae-990b76020c41',booking_id:'3cbe8441-0cbb-4c7b-a7ad-56f47d791ed4',full_name:'SYEDA SADIA JAHAN',passport_number:'A04809370',package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c',selling_price:140000,discount:0,final_price:140000},
      {id:'c003670a-7432-4274-93b3-f7937c56c44d',booking_id:'3cbe8441-0cbb-4c7b-a7ad-56f47d791ed4',full_name:'SAIDA WASIMA',passport_number:'A05167267',package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c',selling_price:140000,discount:0,final_price:140000},
      {id:'793649e2-2312-4998-b29c-9e1af5ad5d8f',booking_id:'3cbe8441-0cbb-4c7b-a7ad-56f47d791ed4',full_name:'SABINA YESMIN',passport_number:'A17041894',package_id:'1d1066c8-ba88-43f0-b639-71c992f14b8c',selling_price:140000,discount:0,final_price:140000},
      {id:'b676a2cc-d78e-4a0b-a573-882a78e10a75',booking_id:'9de8a3b6-565b-499c-8b71-fc139981c52f',full_name:'MOHAMMAD JASIM UDDIN',passport_number:'A06256598',package_id:'9547868e-d3f4-4b27-bda8-1b9bb8138212',selling_price:750000,discount:29998,final_price:720002},
      {id:'a43e2a29-1785-4549-a83e-7566158d551e',booking_id:'9de8a3b6-565b-499c-8b71-fc139981c52f',full_name:'MST SALMA PRODHAN',passport_number:'A14238035',package_id:'9547868e-d3f4-4b27-bda8-1b9bb8138212',selling_price:750000,discount:30000,final_price:720000},
    ];
    
    for (const m of members) {
      await client.query(
        `INSERT INTO booking_members (id, booking_id, full_name, passport_number, package_id, selling_price, discount, final_price) 
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [m.id, m.booking_id, m.full_name, m.passport_number, m.package_id, m.selling_price, m.discount, m.final_price]
      );
    }

    // =============================================
    // 10. SITE CONTENT
    // =============================================
    console.log('Migrating site content...');
    const siteContent = [
      { section_key: 'about', content: {"description":"RAHE KABA Tours & Travels has been serving pilgrims from Narayanganj-Dhaka, Bangladesh with excellence since 2010.","heading":"A Journey of","heading_highlight":"Faith & Trust","reasons":[{"desc":"Fully licensed and government-approved Hajj & Umrah agency","title":"Government Approved"},{"desc":"Dedicated support from booking to return journey","title":"Personalized Care"},{"desc":"Top-rated hotels, transport and services at every step","title":"Premium Quality"},{"desc":"Over a decade of trusted service in sacred travel","title":"15+ Years"}],"section_label":"Why Choose Us"} },
      { section_key: 'contact', content: {"email":"rahekaba.info@gmail.com","heading":"Contact","heading_highlight":"Us","hours":"Sat - Thu: 9AM - 9PM","location":"দৈলরবাগ পল্লী বিদ্যুৎ সংলগ্ন, সোনারগাঁও থানা রোড, নারায়ণগঞ্জ-ঢাকা","phone":"+880 1601-505050","section_label":"Get In Touch"} },
      { section_key: 'footer', content: {"address":"দৈলরবাগ পল্লী বিদ্যুৎ সংলগ্ন, সোনারগাঁও থানা রোড, নারায়ণগঞ্জ-ঢাকা","company_name":"RAHE KABA","company_tagline":"Tours & Travels","description":"Your trusted partner for Hajj & Umrah from Narayanganj-Dhaka, Bangladesh.","developer_name":"DigiWebDex","developer_url":"https://digiwebdex.com","email":"rahekaba.info@gmail.com","phone":"+880 1601-505050","services_list":["Hajj Packages","Umrah Packages","Visa Processing","Air Tickets","Hotel Booking","Ziyara Tours"]} },
      { section_key: 'hero', content: {"badge":"Trusted Since 2010","cta_primary":"Explore Packages","cta_secondary":"Contact Us","heading_highlight":"Begins Here","heading_line1":"Your Sacred","heading_line2":"Journey","stats":[{"label":"Years Experience","value":"15+"},{"label":"Happy Pilgrims","value":"10K+"},{"label":"Premium Packages","value":"50+"},{"label":"Client Rating","value":"4.9★"}],"subheading":"Premium Hajj & Umrah experiences from Narayanganj-Dhaka, Bangladesh."} },
      { section_key: 'navbar', content: {"cta_text":"Book Now","phone":"+880 1601-505050"} },
      { section_key: 'services', content: {"description":"Comprehensive travel services to make your sacred journey comfortable","heading":"Our","heading_highlight":"Services","items":[{"desc":"Complete Hajj packages","icon":"BookOpen","title":"Hajj"},{"desc":"Year-round Umrah packages","icon":"Globe","title":"Umrah"},{"desc":"Hassle-free visa processing","icon":"CreditCard","title":"Visa"},{"desc":"Best-price airline tickets","icon":"Plane","title":"Air Ticket"},{"desc":"Premium hotels near Haram","icon":"Building2","title":"Hotel"},{"desc":"Comfortable ground transportation","icon":"Bus","title":"Transport"},{"desc":"Guided tours to sacred sites","icon":"MapPin","title":"Ziyara"},{"desc":"Experienced multilingual guides","icon":"Users","title":"Guide"}],"section_label":"What We Offer"} },
    ];
    for (const sc of siteContent) {
      await client.query(
        `INSERT INTO site_content (section_key, content) VALUES ($1, $2) ON CONFLICT (section_key) DO UPDATE SET content = $2`,
        [sc.section_key, JSON.stringify(sc.content)]
      );
    }

    // =============================================
    // 11. COMPANY SETTINGS
    // =============================================
    console.log('Migrating company settings...');
    await client.query(
      `INSERT INTO company_settings (id, setting_key, setting_value, updated_by) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      ['f0309b90-6f4e-4076-9d5f-4fc51fecae72', 'signature', JSON.stringify({authorized_name:'',designation:'',signature_url:'',stamp_url:''}), '9c56194a-b0f9-4878-ac57-e97371acd199']
    );

    // =============================================
    // 12. NOTIFICATION SETTINGS
    // =============================================
    console.log('Migrating notification settings...');
    const notifSettings = [
      {id:'52398213-53c9-4876-a180-30c590fc534a',event_key:'booking_completed',event_label:'Booking Completed'},
      {id:'c89acb22-3cd8-4c24-a68b-57237d6b76fa',event_key:'booking_created',event_label:'Booking Created'},
      {id:'1e545092-7712-46ac-9c38-ec7df5cfc9dc',event_key:'booking_status_updated',event_label:'Booking Status Updated'},
      {id:'ee78832e-9088-4a8d-8f4a-3d0bd24aab19',event_key:'commission_paid',event_label:'Commission Paid',sms_enabled:false},
      {id:'19a3363e-8c82-4cf8-b347-38a04217824a',event_key:'daily_due_reminder',event_label:'Daily Due Reminder (Cron)'},
      {id:'b8f0f72f-537c-4bf8-871d-d4196d48513e',event_key:'payment_received',event_label:'Payment Received'},
      {id:'45795904-660e-4a24-846b-60b299871bdc',event_key:'supplier_payment_recorded',event_label:'Supplier Payment Recorded',sms_enabled:false},
    ];
    for (const ns of notifSettings) {
      await client.query(
        `INSERT INTO notification_settings (id, event_key, event_label, email_enabled, sms_enabled, enabled) VALUES ($1,$2,$3,true,$4,true) ON CONFLICT (id) DO NOTHING`,
        [ns.id, ns.event_key, ns.event_label, ns.sms_enabled !== false]
      );
    }

    // =============================================
    // 13. EXPENSES
    // =============================================
    console.log('Migrating expenses...');
    await client.query(`INSERT INTO expenses (id,title,amount,category,expense_type,date,note) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      ['2127d00c-c808-4d7e-8dba-3258d020d91f','RAKIB HASAN',10000,'general','salary','2026-03-07','RAKIB SALARY']);
    await client.query(`INSERT INTO expenses (id,title,amount,category,expense_type,date) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
      ['1abd07a5-68c7-4591-a100-85bf44944c9a','shakib',6000,'general','salary','2026-03-07']);

    // =============================================
    // 14. MOALLEM PAYMENTS
    // =============================================
    console.log('Migrating moallem payments...');
    const moallemPayments = [
      {id:'7915e7d2-fc27-47ac-a53a-b818860c387d',moallem_id:'c3843c19-c516-47ac-890d-597dfc6f7999',amount:55000,date:'2026-02-08',payment_method:'bank',notes:'CRM TO DBBL',recorded_by:'9c56194a-b0f9-4878-ac57-e97371acd199'},
      {id:'e9bed6f7-41a4-4a05-9c84-826c30e99f6b',moallem_id:'c3843c19-c516-47ac-890d-597dfc6f7999',amount:5000,date:'2026-02-10',payment_method:'bank',notes:'DBBL TO DBBL',recorded_by:'9c56194a-b0f9-4878-ac57-e97371acd199'},
      {id:'b91f28e0-f080-43b8-95b9-0c0f82221748',moallem_id:'c3843c19-c516-47ac-890d-597dfc6f7999',amount:50000,date:'2026-02-10',payment_method:'bank',notes:'BRAC TO BRAC',recorded_by:'9c56194a-b0f9-4878-ac57-e97371acd199'},
      {id:'8f90fc13-7877-43ad-be91-988f67887ea0',moallem_id:'c3843c19-c516-47ac-890d-597dfc6f7999',amount:49000,date:'2026-02-17',payment_method:'bank',notes:'CRM TO DBBL',recorded_by:'9c56194a-b0f9-4878-ac57-e97371acd199'},
      {id:'9dfec5d4-0116-427b-b7c9-0fc01c11c8be',moallem_id:'c3843c19-c516-47ac-890d-597dfc6f7999',amount:5000,date:'2026-02-18',payment_method:'bank',notes:'CRM TO DBBL',recorded_by:'9c56194a-b0f9-4878-ac57-e97371acd199'},
      {id:'8f2eae1c-d7dc-4376-b44a-d11e9482796e',moallem_id:'c3843c19-c516-47ac-890d-597dfc6f7999',amount:172500,date:'2026-02-18',payment_method:'bank',notes:'CRM TO DBBL',recorded_by:'9c56194a-b0f9-4878-ac57-e97371acd199'},
      {id:'a9ede7e4-a711-4351-8492-01440e787ad8',moallem_id:'c3843c19-c516-47ac-890d-597dfc6f7999',amount:92500,date:'2026-02-21',payment_method:'bank',notes:'CRM TO DBBL',recorded_by:'9c56194a-b0f9-4878-ac57-e97371acd199'},
      {id:'0f3a0bc0-1ed0-47e5-831e-accf220f62e1',moallem_id:'c3843c19-c516-47ac-890d-597dfc6f7999',amount:160000,date:'2026-02-23',payment_method:'bank',notes:'BRAC TO BRAC',recorded_by:'9c56194a-b0f9-4878-ac57-e97371acd199'},
      {id:'e0f5e296-f1f6-46ae-89ed-70e179d014a8',moallem_id:'c3843c19-c516-47ac-890d-597dfc6f7999',amount:120000,date:'2026-02-24',payment_method:'bank',notes:'DBBL TO DBBL',recorded_by:'9c56194a-b0f9-4878-ac57-e97371acd199'},
      {id:'02238c95-14d2-45a7-83fa-94f329bcc7e8',moallem_id:'c3843c19-c516-47ac-890d-597dfc6f7999',amount:50000,date:'2026-02-25',payment_method:'bank',notes:'ISLAMI TO ISALMI',recorded_by:'9c56194a-b0f9-4878-ac57-e97371acd199'},
      {id:'6a77cde5-11c1-43ca-9264-cfb48930a3c7',moallem_id:'c3843c19-c516-47ac-890d-597dfc6f7999',amount:100000,date:'2026-03-02',payment_method:'bank',notes:'DBBL TO DBBL',recorded_by:'9c56194a-b0f9-4878-ac57-e97371acd199'},
      {id:'7d5d53a8-1a1a-4d63-a410-2b5c08b58dc3',moallem_id:'c3843c19-c516-47ac-890d-597dfc6f7999',amount:100000,date:'2026-03-02',payment_method:'bank',notes:'DBBL TO DBBL',recorded_by:'9c56194a-b0f9-4878-ac57-e97371acd199'},
      {id:'29042f8f-251a-4dc8-be4e-0bd853d5e498',moallem_id:'c3843c19-c516-47ac-890d-597dfc6f7999',amount:100000,date:'2026-02-24',payment_method:'bank',notes:'DBBL TO DBBL',recorded_by:'9c56194a-b0f9-4878-ac57-e97371acd199'},
      {id:'81f58ee3-3f7d-44f4-8bc8-14b39d6b7ad2',moallem_id:'c3843c19-c516-47ac-890d-597dfc6f7999',amount:100000,date:'2026-02-24',payment_method:'bank',notes:'DBBL TO DBBL',recorded_by:'9c56194a-b0f9-4878-ac57-e97371acd199'},
    ];
    for (const mp of moallemPayments) {
      await client.query(
        `INSERT INTO moallem_payments (id,moallem_id,amount,date,payment_method,notes,recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [mp.id, mp.moallem_id, mp.amount, mp.date, mp.payment_method, mp.notes, mp.recorded_by]
      );
    }

    // =============================================
    // 15. SUPPLIER AGENT PAYMENTS
    // =============================================
    console.log('Migrating supplier agent payments...');
    await client.query(
      `INSERT INTO supplier_agent_payments (id,supplier_agent_id,amount,date,payment_method,notes,recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      ['e9b39afa-04b6-4d59-80e2-a23edfd9766f','8cd79710-b5f2-41c0-a02d-1cad56bde625',140000,'2026-02-10','bank','ISLAMI TO ISLAMI','9c56194a-b0f9-4878-ac57-e97371acd199']
    );

    // =============================================
    // 16. FINANCIAL SUMMARY
    // =============================================
    console.log('Migrating financial summary...');
    await client.query(
      `INSERT INTO financial_summary (id, total_income, total_expense, net_profit) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET total_income=$2, total_expense=$3, net_profit=$4`,
      ['c47de68e-13cf-449f-9dfd-7b3dbab5beab', 11104499, 156000, 10948499]
    );

    // =============================================
    // 17. USER ROLES (ensure admin role exists)
    // =============================================
    console.log('Ensuring user roles...');
    await client.query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin') ON CONFLICT (user_id, role) DO NOTHING`,
      ['9c56194a-b0f9-4878-ac57-e97371acd199']
    );

    // Re-enable triggers
    console.log('Re-enabling triggers...');
    await client.query('SET session_replication_role = DEFAULT');
    
    await client.query('COMMIT');
    console.log('\n✅ Migration completed successfully!');
    console.log('Tables migrated: accounts, installment_plans, packages, supplier_agents, moallems,');
    console.log('  profiles, bookings, booking_members, site_content, company_settings,');
    console.log('  notification_settings, expenses, moallem_payments, supplier_agent_payments,');
    console.log('  financial_summary, user_roles');
    console.log('\n⚠️  Note: Payments and transactions were NOT migrated (triggers will recreate them).');
    console.log('  The financial_summary was directly set to match Supabase values.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
