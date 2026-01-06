import { useState } from 'react';

const TokenIcon = ({ iconUrl, symbol, size = "md", className = "" }) => {
    const [imageError, setImageError] = useState(false);

    // Size mapping
    const sizeClasses = {
        sm: "w-8 h-8 text-[10px]",
        md: "w-10 h-10 text-xs",
        lg: "w-16 h-16 text-2xl"
    };

    const dimensions = sizeClasses[size] || sizeClasses.md;

    // Remove comment nodes logic by handling state purely in React
    if (iconUrl && !imageError) {
        return (
            <img
                src={iconUrl}
                alt={symbol}
                className={`${dimensions} rounded-full bg-slate-700 object-cover ${className}`}
                onError={() => {
                    console.log("Failed to load icon:", iconUrl);
                    setImageError(true);
                }}
            />
        );
    }

    // Fallback UI
    return (
        <div className={`${dimensions} rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-400 shadow-inner ${className}`}>
            {symbol?.[0]}
        </div>
    );
};

export default TokenIcon;
