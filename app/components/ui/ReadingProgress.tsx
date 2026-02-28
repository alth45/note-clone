"use client";

import { useEffect, useState } from "react";

export default function ReadingProgress() {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const updateProgress = () => {
            const currentScrollY = window.scrollY;
            const scrollHeight = document.body.scrollHeight - window.innerHeight;

            if (scrollHeight) {
                setProgress(Number((currentScrollY / scrollHeight).toFixed(2)) * 100);
            }
        };

        window.addEventListener("scroll", updateProgress);
        return () => window.removeEventListener("scroll", updateProgress);
    }, []);

    return (
        <div className="fixed top-0 left-0 w-full h-1 z-[60] bg-transparent">
            <div
                className="h-full bg-sumi transition-all duration-150 ease-out"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}