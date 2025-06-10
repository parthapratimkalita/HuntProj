import { useState, useEffect } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfMonth, endOfMonth, addMonths, isSameMonth, isBefore } from "date-fns";
import { DateRange } from "react-day-picker";

export function DateRangePicker({
  onSelect,
}: {
  onSelect?: (range: DateRange | undefined) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'dates' | 'flexible'>('dates');
  const [monthPage, setMonthPage] = useState(0); // 0 for first 6 months, 1 for next 6 months
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset to current month when reopening the calendar (if no date is selected)
  useEffect(() => {
    if (isOpen && !date?.from) {
      setCurrentMonth(new Date());
    }
  }, [isOpen, date]);

  // Ensure currentMonth is never before the current month
  useEffect(() => {
    const today = new Date();
    if (isBefore(currentMonth, startOfMonth(today))) {
      setCurrentMonth(today);
    }
  }, [currentMonth]);

  // Lock scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const nextMonth = new Date(currentMonth);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    if (range?.from && range?.to) {
      onSelect?.(range);
    }
  };

  const handleQuickAdjust = (days: number) => {
    if (!date?.from || !date?.to) {
      // If no dates selected, start from today
      const today = new Date();
      const endDate = addDays(today, days);
      const range: DateRange = {
        from: today,
        to: endDate
      };
      setDate(range);
      onSelect?.(range);
    } else {
      // Adjust existing date range, but ensure start date is not in the past
      const today = new Date();
      const startDate = date.from < today ? today : date.from;
      const newEndDate = addDays(date.to, days);
      const range: DateRange = {
        from: startDate,
        to: newEndDate
      };
      setDate(range);
      onSelect?.(range);
    }
  };

  const handleFlexibleSelect = (duration: string) => {
    const today = new Date();
    let endDate: Date;
    
    switch (duration) {
      case 'weekend':
        endDate = addDays(today, 2);
        break;
      case 'week':
        endDate = addDays(today, 7);
        break;
      case 'month':
        endDate = addDays(today, 30);
        break;
      default:
        endDate = addDays(today, 7);
    }
    
    const range: DateRange = {
      from: today,
      to: endDate
    };
    setDate(range);
    onSelect?.(range);
  };

  const handleMonthSelect = (monthOffset: number) => {
    const targetMonth = addMonths(new Date(), monthOffset);
    const range: DateRange = {
      from: startOfMonth(targetMonth),
      to: endOfMonth(targetMonth)
    };
    setDate(range);
    onSelect?.(range);
  };

  const resetDates = () => {
    setDate(undefined);
    setCurrentMonth(new Date());
  };

  // Reusable action buttons component
  const ActionButtons = () => (
    <div className="flex items-center justify-between pt-3 border-t gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={resetDates}
        className="mobile-button flex items-center text-gray-600 min-w-[80px]"
      >
        Clear
      </Button>
      
      <Button 
        variant="default"
        className="mobile-button bg-black hover:bg-gray-800 text-white min-w-[80px] flex-1 max-w-[120px]"
        onClick={() => {
          if (date?.from && date?.to) {
            onSelect?.(date);
            setIsOpen(false);
          }
        }}
        disabled={!date?.from || !date?.to}
      >
        Close
      </Button>
    </div>
  );

  const numberOfMonths = isMobile ? 1 : 2;
  const monthIncrement = 1; // Always increment by 1 month regardless of display

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          type="button"
          className="date-picker-button w-full grid grid-cols-2 gap-2 cursor-pointer focus:outline-none focus:ring-0 border-0 bg-transparent p-0 m-0"
          style={{
            outline: 'none !important',
            border: 'none !important',
            background: 'transparent !important',
            boxShadow: 'none !important'
          }}
          onFocus={(e) => e.target.blur()}
        >
          <div className="date-picker-field border border-gray-300 rounded-md p-2 hover:border-gray-400 transition-colors">
            <div className="text-xs font-medium text-gray-500 mb-1 text-left">Departure</div>
            <div className="flex items-center text-sm text-left">
              {date?.from ? (
                <span>{format(date.from, "MMM dd, yyyy")}</span>
              ) : (
                <span className="text-gray-500">Add date</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 text-gray-500" />
            </div>
          </div>
          
          <div className="date-picker-field border border-gray-300 rounded-md p-2 hover:border-gray-400 transition-colors">
            <div className="text-xs font-medium text-gray-500 mb-1 text-left">Return</div>
            <div className="flex items-center text-sm text-left">
              {date?.to ? (
                <span>{format(date.to, "MMM dd, yyyy")}</span>
              ) : (
                <span className="text-gray-500">Add date</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 text-gray-500" />
            </div>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className={`${isMobile ? 'w-[350px]' : 'w-[700px]'} p-0 border shadow-lg rounded-lg z-50 transition-all duration-200 ease-in-out animate-in fade-in slide-in-from-top-2`} 
        align="start"
        side="bottom"
        sideOffset={8}
        avoidCollisions={false}
        sticky="always"
      >
        <div className={`bg-white rounded-lg ${isMobile ? 'w-[350px]' : 'w-[700px]'}`}>
          {/* Tab Navigation */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('dates')}
              className={cn(
                "flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'dates' 
                  ? "border-black text-black" 
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              Dates
            </button>
            <button
              onClick={() => setActiveTab('flexible')}
              className={cn(
                "flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'flexible' 
                  ? "border-black text-black" 
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              Flexible
            </button>
          </div>

          {activeTab === 'dates' && (
          <div className="p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            {/* Only show left button if we can navigate back without going before current month */}
            {(() => {
              const today = new Date();
              const currentMonthStart = startOfMonth(today);
              const wouldGoTo = new Date(currentMonth);
              wouldGoTo.setMonth(wouldGoTo.getMonth() - monthIncrement);
              
              // Can navigate back if the destination month is not before the current month
              const canNavigateBack = !isBefore(startOfMonth(wouldGoTo), currentMonthStart);
              
              return canNavigateBack ? (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    const prev = new Date(currentMonth);
                    prev.setMonth(prev.getMonth() - monthIncrement);
                    setCurrentMonth(prev);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <div className="w-10 h-10"></div> // Placeholder to maintain layout
              );
            })()}
            <div className={`flex ${isMobile ? 'justify-center' : 'space-x-8'}`}>
              <div className="text-center font-medium">
                {format(currentMonth, "MMMM yyyy")}
              </div>
              {!isMobile && (
                <div className="text-center font-medium">
                  {format(nextMonth, "MMMM yyyy")}
                </div>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                const next = new Date(currentMonth);
                next.setMonth(next.getMonth() + monthIncrement);
                setCurrentMonth(next);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Calendar */}
          <div className="flex justify-center mb-4">
            <CalendarComponent
              mode="range"
              selected={date}
              onSelect={handleSelect}
              month={currentMonth}
              numberOfMonths={numberOfMonths}
              className="border-0 text-sm"
              showOutsideDays={false}
              disabled={{ before: new Date() }}
              components={{
                IconLeft: () => null,
                IconRight: () => null,
                Caption: () => null, // Hide individual month captions since we show them above
              }}
            />
          </div>

          {/* Quick Date Adjustment Buttons */}
          <div className="flex flex-wrap gap-2 mb-4 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdjust(1)}
              className="text-xs px-3 py-1 h-8 border-gray-300"
            >
              ± 1 day
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdjust(2)}
              className="text-xs px-3 py-1 h-8 border-gray-300"
            >
              ± 2 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdjust(3)}
              className="text-xs px-3 py-1 h-8 border-gray-300"
            >
              ± 3 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdjust(7)}
              className="text-xs px-3 py-1 h-8 border-gray-300"
            >
              ± 7 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAdjust(14)}
              className="text-xs px-3 py-1 h-8 border-gray-300"
            >
              ± 14 days
            </Button>
          </div>
          
          <ActionButtons />
        </div>
        )}

        {activeTab === 'flexible' && (
        <div className="p-4">
          {/* How long would you like to stay? */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">How long would you like to stay?</h3>
            <div className="flex gap-3 mb-6">
              <Button
                variant="outline"
                onClick={() => handleFlexibleSelect('weekend')}
                className="flex-1 py-3 border-gray-300"
              >
                Weekend
              </Button>
              <Button
                variant="outline"
                onClick={() => handleFlexibleSelect('week')}
                className="flex-1 py-3 border-gray-300"
              >
                Week
              </Button>
              <Button
                variant="outline"
                onClick={() => handleFlexibleSelect('month')}
                className="flex-1 py-3 border-gray-300"
              >
                Month
              </Button>
            </div>
          </div>

          {/* Go anytime */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Go anytime</h3>
              <div className="flex items-center space-x-2">
                {/* Only show left button if we're not on the first page showing current month */}
                {monthPage > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMonthPage(0)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <span className="text-xs text-gray-500">
                  {monthPage === 0 ? "1-6" : "7-12"}
                </span>
                {/* Only show right button if we're not on the last page */}
                {monthPage < 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMonthPage(1)}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const monthOffset = (monthPage * 6) + index;
                const month = addMonths(new Date(), monthOffset);
                const monthName = format(month, "MMMM");
                const year = format(month, "yyyy");
                const today = new Date();
                const isCurrentMonth = isSameMonth(month, today);
                const isPastMonth = month < startOfMonth(today) && !isCurrentMonth;
                
                return (
                  <Button
                    key={monthOffset}
                    variant="outline"
                    onClick={() => handleMonthSelect(monthOffset)}
                    disabled={isPastMonth}
                    className={`p-4 h-auto flex flex-col items-center border-gray-300 ${
                      isPastMonth ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <CalendarIcon className="h-6 w-6 mb-2" />
                    <div className="text-sm font-medium">{monthName}</div>
                    <div className="text-xs text-gray-500">{year}</div>
                  </Button>
                );
              })}
            </div>
          </div>

          <ActionButtons />
        </div>
        )}

        </div>
      </PopoverContent>
    </Popover>
  );
}