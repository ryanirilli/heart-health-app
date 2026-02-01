"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Calculate scroll percentage
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      
      const scrollableHeight = scrollHeight - clientHeight;
      
      // Avoid division by zero
      if (scrollableHeight <= 0) {
        setIsVisible(false);
        return;
      }
      
      const scrollPercentage = scrollTop / scrollableHeight;
      
      // Show when scrolled > 50%
      setIsVisible(scrollPercentage > 0.5);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-24 left-0 right-0 z-40 mx-auto w-fit md:hidden pointer-events-none"
        >
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full shadow-lg bg-background/80 backdrop-blur-sm border pointer-events-auto pl-4 pr-3 py-5 gap-2"
            onClick={scrollToTop}
          >
            <span className="text-sm font-medium">Scroll to top</span>
            <ArrowUp className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
