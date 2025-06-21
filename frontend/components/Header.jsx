import { motion } from 'framer-motion';

export default function Header() {
  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120 }}
      className="w-full bg-white shadow-md py-4 px-6 flex items-center justify-between"
    >
      <div className="flex items-center">
        <img src="/logo.jpg" alt="ChopWise" className="h-12 w-12 mr-3 rounded-full" />
        <h1 className="text-3xl font-extrabold text-teal-700">ChopWise</h1>
      </div>
    </motion.header>
  );
}
