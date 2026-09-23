export interface ProjectItem {
  id: string;
  title: string;
  category: string;
  timeAgo: string;
  previewGradient: string;
  previewImage?: string;
  badge: string;
  tech: string[];
}

export const INITIAL_PROJECTS: ProjectItem[] = [];

export const INITIAL_FILES: Record<string, string> = {
  'page.tsx': `import { Hero } from '@/components/Hero'
import { About } from '@/components/About'
import { Projects } from '@/components/Projects'
import { Contact } from '@/components/Contact'

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Hero />
      <About />
      <Projects />
      <Contact />
    </div>
  )
}`,

  'Hero.tsx': `export function Hero() {
  return (
    <header className="relative overflow-hidden py-24 px-6 text-center bg-black border-b border-zinc-800">
      <div className="max-w-4xl mx-auto">
        <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-300 border border-zinc-700 mb-6">
          ✨ Available for new opportunities
        </span>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 text-white">
          Hi, I'm <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400">Shreya Raut</span>
        </h1>
        <p className="text-xl md:text-2xl text-zinc-400 font-medium mb-8">
          Frontend Developer &amp; UI Architect
        </p>
        <div className="flex justify-center gap-4">
          <button className="px-6 py-3 rounded-md bg-white text-black font-semibold shadow hover:bg-zinc-200 transition">
            View My Work
          </button>
          <button className="px-6 py-3 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 font-semibold text-white transition">
            Contact Me
          </button>
        </div>
      </div>
    </header>
  )
}`,

  'About.tsx': `export function About() {
  return (
    <section className="py-20 px-6 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-4 text-center">About Me</h2>
      <p className="text-slate-400 text-center max-w-2xl mx-auto leading-relaxed">
        Passionate software engineer focused on building clean, performant, and delightful digital experiences using modern web technologies.
      </p>
    </section>
  )
}`,

  'Projects.tsx': `export function Projects() {
  const projects = [
    { title: 'Fintech Dashboard', desc: 'Real-time analytics & charts' },
    { title: 'AI Assistant Interface', desc: 'Conversational agent frontend' },
    { title: 'Design System Library', desc: '50+ accessible micro-components' }
  ];

  return (
    <section className="py-20 px-6 max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold mb-10 text-center">Featured Projects</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {projects.map((p, i) => (
          <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition">
            <h3 className="text-xl font-bold mb-2">{p.title}</h3>
            <p className="text-slate-400 text-sm">{p.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}`,

  'Contact.tsx': `export function Contact() {
  return (
    <footer className="py-16 px-6 text-center border-t border-slate-800/80">
      <h2 className="text-2xl font-bold mb-2">Let's Build Something Together</h2>
      <p className="text-slate-400 mb-6">Open for contract and full-time inquiries.</p>
      <a href="mailto:shreya@example.com" className="text-purple-400 hover:underline font-semibold">
        shreya@example.com
      </a>
    </footer>
  )
}`,

  'globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --primary: #A855F7;
  --secondary: #EC4899;
}

body {
  margin: 0;
  background-color: #030712;
  color: #F9FAFB;
  font-family: 'Inter', sans-serif;
}`,

  'package.json': `{
  "name": "portfolio-website",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.363.0"
  }
}`
};
