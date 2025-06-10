import { useState } from "react";
import { cn } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  icon: React.ReactNode;
};

interface CategoryNavProps {
  onCategoryChange?: (category: string | null) => void;
}

export default function CategoryNav({ onCategoryChange }: CategoryNavProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  
  const categories: Category[] = [
    {
      id: "lodges",
      name: "Lodges",
      icon: <i className="fas fa-campground text-lg mb-1"></i>
    },
    {
      id: "cabins",
      name: "Cabins",
      icon: <i className="fas fa-tree text-lg mb-1"></i>
    },
    {
      id: "mountain",
      name: "Mountain",
      icon: <i className="fas fa-mountain text-lg mb-1"></i>
    },
    {
      id: "lakefront",
      name: "Lakefront",
      icon: <i className="fas fa-water text-lg mb-1"></i>
    },
    {
      id: "ranches",
      name: "Ranches",
      icon: <i className="fas fa-home text-lg mb-1"></i>
    },
    {
      id: "connected",
      name: "Connected",
      icon: <i className="fas fa-wifi text-lg mb-1"></i>
    },
    {
      id: "trails",
      name: "Trails",
      icon: <i className="fas fa-hiking text-lg mb-1"></i>
    },
    {
      id: "ranges",
      name: "Ranges",
      icon: <i className="fas fa-crosshairs text-lg mb-1"></i>
    }
  ];
  
  const handleCategoryClick = (categoryId: string) => {
    const newCategory = categoryId === activeCategory ? null : categoryId;
    setActiveCategory(newCategory);
    if (onCategoryChange) {
      onCategoryChange(newCategory);
    }
  };

  return (
    <div className="border-b border-gray-200 bg-white sticky top-[72px] z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center overflow-x-auto py-4 no-scrollbar">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={cn(
                "flex flex-col items-center min-w-[80px] mr-8 opacity-70 hover:opacity-100 transition-opacity",
                activeCategory === category.id && "border-b-2 border-black pb-2 opacity-100"
              )}
            >
              {category.icon}
              <span className="text-xs font-medium">{category.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
