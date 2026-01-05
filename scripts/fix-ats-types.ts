import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { CompanySchema } from '../src/companies/schemas/company.schema';

dotenv.config();

const Company = mongoose.model('Company', CompanySchema);

async function fix() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/job-agent');

    const updates = [
        { name: 'GitLab', ats: 'greenhouse' },
        { name: 'HashiCorp', ats: 'greenhouse' },
        { name: 'Grafana', ats: 'greenhouse' },
        { name: 'Remote', ats: 'greenhouse' },
        { name: 'Supabase', ats: 'greenhouse' },
        { name: 'Mercury', ats: 'greenhouse' },
        { name: 'Figma', ats: 'greenhouse' },
        { name: 'Autify', ats: 'lever' },
        { name: 'Knock', ats: 'greenhouse' },
        { name: 'Warp', ats: 'greenhouse' },
        { name: 'Replit', ats: 'greenhouse' },
        { name: 'Vercel', ats: 'greenhouse' },
        { name: 'Neon', ats: 'greenhouse' },
        { name: 'Zapier', ats: 'greenhouse' },
        { name: 'Canonical', ats: 'greenhouse' },
        { name: 'InVision', ats: 'greenhouse' },
    ];

    for (const u of updates) {
        await Company.updateOne({ name: u.name }, { atsType: u.ats });
        console.log(`Updated ${u.name} back to ${u.ats}`);
    }

    console.log('Done!');
    await mongoose.disconnect();
}

fix();
