import { motion } from 'framer-motion';

export default function LoadingSpinner() {
  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-transparent">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-10 h-10 border-4 border-gray-200 border-t-[#fb3c44] rounded-full"
      />
    </div>
  );
}
