import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { CompanySchema } from '../src/companies/schemas/company.schema';

dotenv.config();

const Company = mongoose.model('Company', CompanySchema);

const companies = [
    { name: 'GitLab', homepageUrl: 'https://about.gitlab.com', careerPageUrl: 'https://boards.greenhouse.io/gitlab', ats: 'greenhouse' },
    { name: 'HashiCorp', homepageUrl: 'https://www.hashicorp.com', careerPageUrl: 'https://boards.greenhouse.io/hashicorp', ats: 'greenhouse' },
    { name: 'Grafana', homepageUrl: 'https://grafana.com', careerPageUrl: 'https://boards.greenhouse.io/grafanalabs', ats: 'greenhouse' },
    { name: 'Remote', homepageUrl: 'https://remote.com', careerPageUrl: 'https://boards.greenhouse.io/remote', ats: 'greenhouse' },
    { name: 'Supabase', homepageUrl: 'https://supabase.com', careerPageUrl: 'https://boards.greenhouse.io/supabase', ats: 'greenhouse' },
    { name: 'Mercury', homepageUrl: 'https://mercury.com', careerPageUrl: 'https://boards.greenhouse.io/mercury', ats: 'greenhouse' },
    { name: 'Figma', homepageUrl: 'https://www.figma.com', careerPageUrl: 'https://boards.greenhouse.io/figma', ats: 'greenhouse' },
    { name: 'Autify', homepageUrl: 'https://autify.com', careerPageUrl: 'https://jobs.lever.co/autify', ats: 'lever' },
    { name: 'Knock', homepageUrl: 'https://knock.app', careerPageUrl: 'https://boards.greenhouse.io/knock', ats: 'greenhouse' },
    { name: 'Warp', homepageUrl: 'https://www.warp.dev', careerPageUrl: 'https://boards.greenhouse.io/warp', ats: 'greenhouse' },
    { name: 'Replit', homepageUrl: 'https://replit.com', careerPageUrl: 'https://boards.greenhouse.io/replit', ats: 'greenhouse' },
    { name: 'Vercel', homepageUrl: 'https://vercel.com', careerPageUrl: 'https://boards.greenhouse.io/vercel', ats: 'greenhouse' },
    { name: 'Neon', homepageUrl: 'https://neon.tech', careerPageUrl: 'https://boards.greenhouse.io/neon', ats: 'greenhouse' },
    { name: 'Zapier', homepageUrl: 'https://zapier.com', careerPageUrl: 'https://boards.greenhouse.io/zapier', ats: 'greenhouse' },
    { name: 'Canonical', homepageUrl: 'https://canonical.com', careerPageUrl: 'https://boards.greenhouse.io/canonical', ats: 'greenhouse' },
    { name: 'InVision', homepageUrl: 'https://www.invisionapp.com', careerPageUrl: 'https://boards.greenhouse.io/invision', ats: 'greenhouse' },
];

async function seed() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/job-agent');

    console.log(`Seeding ${companies.length} companies...`);

    for (const c of companies) {
        // Update or create
        await Company.updateOne(
            { name: c.name },
            {
                $set: {
                    homepageUrl: c.homepageUrl,
                    careerPageUrl: c.careerPageUrl,
                    atsType: c.ats
                }
            },
            { upsert: true }
        );
        console.log(`Upserted: ${c.name}`);
    }

    console.log('Done!');
    await mongoose.disconnect();
}

seed();
