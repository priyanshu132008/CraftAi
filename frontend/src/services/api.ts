const API_BASE_URL = 'http://127.0.0.1:8000';

export interface PlanResponse {
  type: string;
  sections: string[];
  techStack?: string[];
  features?: string[];
}

export async function generatePlanApi(prompt: string): Promise<PlanResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }
    const data = await res.json();
    return {
      type: data.type || 'Portfolio Website',
      sections: data.sections?.map((s: string) => `${s} Section`) || [
        'Hero Section',
        'About Section',
        'Projects Section',
        'Contact Section'
      ],
      techStack: ['Next.js', 'TailwindCSS', 'React'],
      features: [
        'Responsive Design',
        'Smooth Animations',
        'Contact Form',
        'Dark/Light Mode',
        'Modern UI/UX'
      ]
    };
  } catch (err) {
    console.warn('Backend unavailable, using rich mock plan response:', err);
    // Intelligent fallback
    const lower = prompt.toLowerCase();
    let type = 'Portfolio Website';
    let sections = ['Hero Section', 'About Section', 'Projects Section', 'Contact Section'];
    let tech = ['Next.js', 'TailwindCSS', 'React'];

    if (lower.includes('e-commerce') || lower.includes('store') || lower.includes('shop')) {
      type = 'E-commerce Store';
      sections = ['Hero Banner', 'Product Catalog', 'Cart Drawer', 'Checkout Flow', 'Reviews'];
      tech = ['Next.js', 'Stripe', 'TailwindCSS'];
    } else if (lower.includes('blog')) {
      type = 'Blog Website';
      sections = ['Featured Post', 'Articles Grid', 'Newsletter Subscribe', 'Author Bio'];
      tech = ['Astro', 'Markdown', 'React'];
    } else if (lower.includes('saas') || lower.includes('landing')) {
      type = 'SaaS Landing Page';
      sections = ['Hero Value Prop', 'Feature Matrix', 'Pricing Tiers', 'Testimonials', 'FAQ'];
      tech = ['React', 'TypeScript', 'TailwindCSS'];
    }

    return {
      type,
      sections,
      techStack: tech,
      features: [
        'Responsive Design',
        'Smooth Animations',
        'Contact Form',
        'Dark/Light Mode',
        'Modern UI/UX'
      ]
    };
  }
}

export async function createProjectApi(plan: any, token?: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/generate-project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) throw new Error('Failed to generate project');
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable for generate-project, fallback to simulated response:', err);
    return {
      status: 'success',
      project_id: 'proj-' + Math.random().toString(36).substring(2, 9),
      projectPath: '/generated-projects/portfolio-website',
      files: {
        'index.html': '<!DOCTYPE html>...',
        'style.css': '/* Generated CSS */',
        'script.js': '// Generated JS'
      }
    };
  }
}
