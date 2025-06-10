import { useState } from "react";
import { cn } from "@/lib/utils";

type GameType = {
  id: string;
  name: string;
  icon: React.ReactNode;
};

interface GameTypeNavProps {
  onGameTypeChange?: (gameType: string | null) => void;
}

export default function GameTypeNav({ onGameTypeChange }: GameTypeNavProps) {
  const [activeType, setActiveType] = useState<string | null>(null);
  
  const gameTypes: GameType[] = [
    {
      id: "best-shots",
      name: "Best shots",
      icon: <i className="fas fa-trophy text-lg mb-1"></i>
    },
    {
      id: "cabin-hunts",
      name: "Cabin hunts",
      icon: <i className="fas fa-home text-lg mb-1"></i>
    },
    {
      id: "stand-hunts",
      name: "Stand hunts",
      icon: <i className="fas fa-binoculars text-lg mb-1"></i>
    },
    {
      id: "stalk-hunts",
      name: "Stalk hunts",
      icon: <i className="fas fa-shoe-prints text-lg mb-1"></i>
    },
    {
      id: "bird-hunts",
      name: "Bird hunts",
      icon: <i className="fas fa-dove text-lg mb-1"></i>
    },
    {
      id: "wild-boar",
      name: "Wild boar",
      icon: <i className="fas fa-piggy-bank text-lg mb-1"></i>
    },
    {
      id: "fallow-deer",
      name: "Fallow deer",
      icon: <i className="fas fa-horse text-lg mb-1"></i>
    },
    {
      id: "deer",
      name: "Deer",
      icon: <i className="fas fa-paw text-lg mb-1"></i>
    },
    {
      id: "moose",
      name: "Moose",
      icon: <i className="fas fa-skull text-lg mb-1"></i>
    },
    {
      id: "wild-boar",
      name: "Wild boar",
      icon: <i className="fas fa-piggy-bank text-lg mb-1"></i>
    },
    {
      id: "muskrat",
      name: "Muskrat",
      icon: <i className="fas fa-otter text-lg mb-1"></i>
    }
  ];
  
  const handleTypeClick = (typeId: string) => {
    const newType = typeId === activeType ? null : typeId;
    setActiveType(newType);
    if (onGameTypeChange) {
      onGameTypeChange(newType);
    }
  };

  return (
    <div className="bg-white pt-16 pb-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center overflow-x-auto py-4 no-scrollbar gap-8">
          {gameTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => handleTypeClick(type.id)}
              className={cn(
                "flex flex-col items-center min-w-[70px] opacity-80 hover:opacity-100 transition-opacity",
                activeType === type.id && "opacity-100"
              )}
            >
              <div className={cn(
                "flex items-center justify-center h-12 w-12 mb-1",
                activeType === type.id 
                  ? "bg-amber-400 text-white rounded-full" 
                  : "bg-gray-100 text-gray-700 rounded-full"
              )}>
                {type.icon}
              </div>
              <span className="text-xs font-medium">{type.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}