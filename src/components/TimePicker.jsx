import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// --- Data Arrays ---
const hours = Array.from({ length: 12 }, (_, i) =>
  (i + 1).toString().padStart(2, "0")
);
const minutes = Array.from({ length: 60 }, (_, i) =>
  i.toString().padStart(2, "0")
);
const periods = ["AM", "PM"];

// --- Helper: Get Item Height ---
const getItemHeight = (ref) => {
  return ref.current?.firstElementChild?.clientHeight || 36;
};

// --- CSS Styles Component ---
const ComponentStyles = () => {
  const css = `
    .tp-beautified-overlay {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
      opacity: 0;
      animation: fadeIn 0.3s forwards;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      padding: 16px;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .tp-beautified-container {
      width: 100%;
      max-width: 600px;
      background: linear-gradient(145deg, rgba(35, 37, 49, 0.95), rgba(25, 27, 36, 0.95));
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      color: #fff;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transform: scale(0.95);
      animation: popIn 0.3s forwards cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }
    @keyframes popIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

    .tp-beautified-header {
      padding: 20px;
      font-size: 18px;
      font-weight: 600;
      text-align: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.9);
    }
    
    .tp-beautified-body {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 252px;
      padding: 0 16px;
      gap: 16px;
    }
    
    .tp-beautified-highlight {
      position: absolute;
      top: 50%;
      left: 16px;
      /* Calculate width to cover only hour and minute columns plus the colon */
      width: calc(75% - 10px);
      height: 36px;
      transform: translateY(-50%);
      background: linear-gradient(90deg, 
        rgba(88, 86, 214, 0.15) 0%, 
        rgba(88, 86, 214, 0.2) 30%, 
        rgba(88, 86, 214, 0.25) 50%, 
        rgba(88, 86, 214, 0.2) 70%, 
        rgba(88, 86, 214, 0.15) 100%);
      border-radius: 12px;
      pointer-events: none;
      border: 1px solid rgba(88, 86, 214, 0.3);
      backdrop-filter: blur(4px);
    }
    
    .tp-beautified-column {
      height: 100%;
      flex: 1;
      overflow-y: scroll;
      scroll-snap-type: y mandatory;
      position: relative;
      z-index: 2;
    }
    .tp-beautified-column::-webkit-scrollbar { display: none; }
    .tp-beautified-column { -ms-overflow-style: none; scrollbar-width: none; }
    
    .tp-beautified-period-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 8px;
      height: 100%;
      padding: 0 16px;
      position: relative;
      z-index: 2;
    }
    
    .tp-beautified-period-option {
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 18px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      min-width: 80px;
      text-align: center;
      backdrop-filter: blur(8px);
    }
    
    .tp-beautified-period-option:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    .tp-beautified-period-option.is-selected {
      background: linear-gradient(145deg, #5856d6, #6b69e6);
      color: #fff;
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(88, 86, 214, 0.4);
      border-color: rgba(255, 255, 255, 0.2);
    }
    
    .tp-beautified-item {
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: rgba(255, 255, 255, 0.5);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      scroll-snap-align: center;
      position: relative;
    }
    
    .tp-beautified-item:hover {
      color: rgba(255, 255, 255, 0.8);
      transform: scale(1.05);
    }
    
    .tp-beautified-item.is-selected {
      color: #fff;
      font-weight: 600;
      transform: scale(1.15);
      text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
    }
    
    .tp-beautified-colon {
      font-size: 24px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.6);
      position: relative;
      z-index: 2;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    }
    
    .tp-beautified-footer {
      display: flex;
      gap: 12px;
      padding: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      background-color: rgba(0,0,0,0.1);
      backdrop-filter: blur(10px);
    }
    
    .tp-beautified-btn {
      flex: 1;
      padding: 16px;
      border-radius: 12px;
      border: none;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(8px);
    }
    
    .tp-beautified-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    .tp-beautified-btn:active { transform: scale(0.98); }
    
    .tp-beautified-btn.cancel {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    
    .tp-beautified-btn.cancel:hover { 
      background: rgba(255, 255, 255, 0.15);
      box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
    }
    
    .tp-beautified-btn.confirm {
      background: linear-gradient(145deg, #5856d6, #6b69e6);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .tp-beautified-btn.confirm:hover { 
      background: linear-gradient(145deg, #6b69e6, #7c7af6);
      box-shadow: 0 4px 20px rgba(88, 86, 214, 0.4);
    }

    /* Responsive styles */
    @media (max-width: 640px) {
      .tp-beautified-overlay {
        padding: 12px;
        align-items: flex-end;
      }
      
      .tp-beautified-container {
        max-width: 100%;
        border-radius: 24px 24px 0 0;
        margin-bottom: 0;
      }
      
      .tp-beautified-body {
        height: 200px;
        gap: 12px;
        padding: 0 12px;
      }
      
      .tp-beautified-highlight {
        left: 12px;
        width: calc(70% - 10px);
        height: 32px;
      }
      
      .tp-beautified-item {
        height: 32px;
        font-size: 20px;
      }
      
      .tp-beautified-period-option {
        padding: 10px 16px;
        font-size: 16px;
        min-width: 70px;
      }
      
      .tp-beautified-colon {
        font-size: 20px;
      }
      
      .tp-beautified-header {
        padding: 16px;
        font-size: 16px;
      }
      
      .tp-beautified-footer {
        padding: 12px;
      }
      
      .tp-beautified-btn {
        padding: 14px;
        font-size: 14px;
      }
    }
    
    @media (max-width: 480px) {
      .tp-beautified-body {
        height: 180px;
        gap: 8px;
        padding: 0 8px;
      }
      
      .tp-beautified-highlight {
        left: 8px;
        width: calc(65% - 10px);
        height: 30px;
      }
      
      .tp-beautified-item {
        height: 30px;
        font-size: 18px;
      }
      
      .tp-beautified-period-option {
        padding: 8px 12px;
        font-size: 14px;
        min-width: 60px;
      }
      
      .tp-beautified-colon {
        font-size: 18px;
      }
      
      .tp-beautified-period-container {
        padding: 0 8px;
      }
    }
    
    @media (max-width: 360px) {
      .tp-beautified-body {
        height: 160px;
        gap: 6px;
      }
      
      .tp-beautified-item {
        height: 28px;
        font-size: 16px;
      }
      
      .tp-beautified-period-option {
        padding: 6px 10px;
        font-size: 12px;
        min-width: 50px;
      }
      
      .tp-beautified-colon {
        font-size: 16px;
      }
    }

    /* For very small heights (landscape mode) */
    @media (max-height: 500px) {
      .tp-beautified-overlay {
        align-items: center;
        padding: 8px;
      }
      
      .tp-beautified-container {
        max-height: 90vh;
        overflow-y: auto;
      }
      
      .tp-beautified-body {
        height: 160px;
      }
    }
  `;
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = css;
    document.head.appendChild(styleElement);
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [css]);
  return null;
};

// --- Main Component ---
const TimePicker = ({ isOpen, onClose, onConfirm, initialTime }) => {
  const [selectedHour, setSelectedHour] = useState("09");
  const [selectedMinute, setSelectedMinute] = useState("00");
  const [selectedPeriod, setSelectedPeriod] = useState("AM");

  const hourRef = useRef(null);
  const minuteRef = useRef(null);

  const scrollTimeout = useRef(null);
  const isInitialSetup = useRef(true);

  const infiniteHours = [...hours, ...hours, ...hours];
  const infiniteMinutes = [...minutes, ...minutes, ...minutes];

  useEffect(() => {
    if (isOpen) {
      isInitialSetup.current = true;
      let initialH = "09",
        initialM = "00",
        initialP = "AM";

      if (initialTime) {
        const [time, period] = initialTime.split(" ");
        [initialH, initialM] = time.split(":");
        initialP = period.toUpperCase();
      }

      setSelectedHour(initialH);
      setSelectedMinute(initialM);
      setSelectedPeriod(initialP);

      setTimeout(() => {
        const itemHeight = getItemHeight(hourRef);
        const hourIndex = hours.indexOf(initialH);
        const minuteIndex = minutes.indexOf(initialM);

        // Calculate center position (3 items above and 3 below the selected item)
        const centerOffset = 3 * itemHeight;

        if (hourRef.current && hourIndex > -1) {
          const targetScrollTop =
            (hours.length + hourIndex) * itemHeight - centerOffset;
          hourRef.current.scrollTop = targetScrollTop;
        }

        if (minuteRef.current && minuteIndex > -1) {
          const targetScrollTop =
            (minutes.length + minuteIndex) * itemHeight - centerOffset;
          minuteRef.current.scrollTop = targetScrollTop;
        }

        setTimeout(() => (isInitialSetup.current = false), 200);
      }, 0);
    }
  }, [isOpen, initialTime]);

  const createScrollHandler = (ref, items, infiniteItems, setter) => () => {
    if (isInitialSetup.current) return;

    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;

      const itemHeight = getItemHeight(el);
      const itemsLength = items.length;

      // Calculate the center index based on scroll position plus center offset
      const centerOffset = 3 * itemHeight; // 3 items above center
      const centerIndex = Math.round(
        (el.scrollTop + centerOffset) / itemHeight
      );
      const newValue = infiniteItems[centerIndex];
      if (newValue) setter(newValue);

      // Infinite scroll logic
      if (centerIndex < itemsLength) {
        el.scrollTop += itemsLength * itemHeight;
      } else if (centerIndex >= itemsLength * 2) {
        el.scrollTop -= itemsLength * itemHeight;
      }
    }, 150);
  };

  const handleConfirm = () =>
    onConfirm(`${selectedHour}:${selectedMinute} ${selectedPeriod}`);

  if (!isOpen) return null;

  return createPortal(
    <>
      <ComponentStyles />
      <div className="tp-beautified-overlay" onMouseDown={onClose}>
        <div
          className="tp-beautified-container"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="tp-beautified-header">Select a Time</div>
          <div className="tp-beautified-body">
            <div className="tp-beautified-highlight"></div>

            <div
              className="tp-beautified-column"
              ref={hourRef}
              onScroll={createScrollHandler(
                hourRef,
                hours,
                infiniteHours,
                setSelectedHour
              )}
            >
              {infiniteHours.map((hour, i) => (
                <div
                  key={`h-${i}`}
                  className={`tp-beautified-item ${
                    selectedHour === hour ? "is-selected" : ""
                  }`}
                >
                  {hour}
                </div>
              ))}
            </div>

            <div className="tp-beautified-colon">:</div>

            <div
              className="tp-beautified-column"
              ref={minuteRef}
              onScroll={createScrollHandler(
                minuteRef,
                minutes,
                infiniteMinutes,
                setSelectedMinute
              )}
            >
              {infiniteMinutes.map((minute, i) => (
                <div
                  key={`m-${i}`}
                  className={`tp-beautified-item ${
                    selectedMinute === minute ? "is-selected" : ""
                  }`}
                >
                  {minute}
                </div>
              ))}
            </div>

            <div className="tp-beautified-period-container">
              {periods.map((period) => (
                <div
                  key={period}
                  className={`tp-beautified-period-option ${
                    selectedPeriod === period ? "is-selected" : ""
                  }`}
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period}
                </div>
              ))}
            </div>
          </div>

          <div className="tp-beautified-footer">
            <button onClick={onClose} className="tp-beautified-btn cancel">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="tp-beautified-btn confirm"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default TimePicker;
