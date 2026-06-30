import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Globe, ArrowLeft, Sparkles, Award, Cpu } from 'lucide-react';
import thinukaImg from '../assets/developer_thinuka.png';
import sesanduImg from '../assets/developer_sesandu.jpeg';

// Custom GitHub SVG Icon to avoid missing lucide-react brand icons
const GithubIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

// Custom LinkedIn SVG Icon to avoid missing lucide-react brand icons
const LinkedinIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

interface Developer {
  name: string;
  role: string;
  bio: string;
  image: string;
  skills: string[];
  website: string;
  github: string;
  linkedin: string;
  theme: 'purple' | 'blue';
}

const developers: Developer[] = [
  {
    name: 'Thinuka Vinjaya Wickramanayaka',
    role: 'Java Full-Stack developer & AI/ML Enthusiast',
    bio: 'I am Thinuka Vinjayawickramanayaka, an undergraduate pursuing a BSc (Hons) in Computer Science and Technology, and a passionate AI/ML learner, Java developer, and full-stack developer.',
    image: thinukaImg,
    skills: ['Java', 'Full-Stack Development', 'Artificial Intelligence(AI)', 'Machine Learning', 'Amazon Web Services (AWS)'],
    website: 'https://thinukavinjaya.site/',
    github: 'https://github.com/ThinukaVinjaya',
    linkedin: 'https://www.linkedin.com/in/thinukavinjayawickramanayaka/',
    theme: 'purple',
  },
  {
    name: 'Sesandu Ramath',
    role: 'Frontend Developer & Networking & Cybersecurity Enthusiast',
    bio: 'I am a Computer Science undergraduate with a strong focus on Network Engineering and Cybersecurity, backed by hands-on experience in designing, configuring, and troubleshooting enterprise-level network environments.',
    image: sesanduImg,
    skills: ['Web Development', 'Ethical Hacking', 'CCNA', 'Networking'],
    website: 'https://github.com/sesandu-raj',
    github: 'https://github.com/sesandu-raj',
    linkedin: 'https://www.linkedin.com/in/sesandu-ramath-69572a2b6/',
    theme: 'blue',
  },
];

export const Developers: React.FC = () => {
  const navigate = useNavigate();

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier for smooth elastic-like easing
      },
    },
  };

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto relative text-left">
      {/* Background Decorative Elements */}
      <div className="absolute top-10 left-10 h-72 w-72 rounded-full bg-brand-purple/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-brand-blue/5 blur-[80px] pointer-events-none" />

      {/* Top action section */}
      <div className="flex items-center justify-between relative z-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-200 cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Header Description */}
      <div className="space-y-2 relative z-10">
        <div className="flex items-center gap-2 text-brand-purple">
          <Sparkles size={20} className="animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest font-display">Development Team</span>
        </div>
        <h1 className="font-display text-2xl md:text-4xl font-extrabold text-white tracking-tight">
          Meet The Developers
        </h1>
        <p className="text-sm text-gray-400 max-w-2xl">
          The technical minds behind the University Treasury Management System, dedicated to crafting beautiful, robust, and efficient software.
        </p>
      </div>

      {/* Developers Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto pt-4 relative z-10"
      >
        {developers.map((dev) => (
          <motion.div
            key={dev.name}
            variants={cardVariants}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="rounded-2xl border border-white/5 bg-[#0e1628]/40 backdrop-blur-xl hover:border-white/10 hover:shadow-2xl hover:shadow-black/20 overflow-hidden flex flex-col transition-colors duration-300"
          >
            {/* Gradient accent top bar */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${dev.theme === 'purple'
              ? 'from-brand-purple via-[#a855f7] to-brand-blue'
              : 'from-brand-blue via-[#06b6d4] to-brand-emerald'
              }`} />

            <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
              <div>
                {/* Developer Headshot & Badges */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-6">
                  <div className="relative group">
                    {/* Ring background animation */}
                    <div className={`absolute -inset-0.5 rounded-full bg-gradient-to-tr ${dev.theme === 'purple' ? 'from-brand-purple to-brand-blue' : 'from-brand-blue to-brand-emerald'
                      } opacity-75 blur-sm group-hover:opacity-100 transition duration-300`} />
                    <img
                      src={dev.image}
                      alt={dev.name}
                      className="relative h-24 w-24 rounded-full object-cover border border-white/10"
                    />
                    <div className="absolute -bottom-1.5 -right-1.5 bg-gray-900 border border-white/10 p-1.5 rounded-full text-white shadow-lg">
                      {dev.theme === 'purple' ? <Cpu size={14} className="text-brand-purple" /> : <Award size={14} className="text-brand-blue" />}
                    </div>
                  </div>

                  <div className="text-center sm:text-left space-y-2">
                    <h3 className="font-display text-xl font-bold text-white tracking-tight">
                      {dev.name}
                    </h3>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${dev.theme === 'purple'
                      ? 'bg-brand-purple/10 text-brand-purple border border-brand-purple/20'
                      : 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                      }`}>
                      {dev.role}
                    </span>
                  </div>
                </div>

                {/* About Bio */}
                <div className="space-y-3 mb-6 text-sm text-gray-300 leading-relaxed text-center sm:text-left">
                  <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wider font-display">About</h4>
                  <p>{dev.bio}</p>
                </div>

                {/* Skills/Tags */}
                <div className="space-y-3 mb-8">
                  <h4 className="font-semibold text-xs text-gray-500 uppercase tracking-wider font-display text-center sm:text-left">Skills</h4>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    {dev.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 text-xs rounded-lg bg-white/[0.03] border border-white/5 text-gray-400"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Social and Web Links */}
              <div className="flex items-center gap-3 justify-center sm:justify-start pt-4 border-t border-white/5">
                <a
                  href={dev.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 text-gray-400 hover:text-white hover:bg-white/[0.08] hover:border-white/15 transition-all duration-200 cursor-pointer"
                  title="Website"
                >
                  <Globe size={18} />
                </a>
                <a
                  href={dev.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 text-gray-400 hover:text-white hover:bg-white/[0.08] hover:border-white/15 transition-all duration-200 cursor-pointer"
                  title="GitHub"
                >
                  <GithubIcon />
                </a>
                <a
                  href={dev.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] border border-white/5 text-gray-400 hover:text-white hover:bg-white/[0.08] hover:border-white/15 transition-all duration-200 cursor-pointer"
                  title="LinkedIn"
                >
                  <LinkedinIcon />
                </a>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
