import * as React from "react";
import { parseDuration } from "./lib/parseDuration";
import { formatTime } from "./lib/formatTime";

interface ReactViewProps {
  content: string | null;
  fileName: string | null;
  onActivityComplete?: (lineIdx: number) => void;
}

interface Activity {
  id: string;
  name: string;
  duration?: number;
  completed: boolean,
  lineIdx: string
}

export const ReactView = ({ content, fileName, onActivityComplete }: ReactViewProps) => {
  const [primeIdx, setPrimeIdx] = React.useState<number>(-1);

  const activities: Activity[] | null = React.useMemo(() => {
    if (!content) {
      return null;
    }

    let hasActivity = false;
    let activityId = 0;
    let activities: Activity[] = [];
    let hasPrimeActivity = false;
    const hasActivityRegex = new RegExp(/^ *[\-*] *\[[ x|X]\]/gm)
    const hasCompletedActivityRegex = new RegExp(/^ *[\-*] *\[[x|X]\]/gm)
    const lines = content.split('\n')
    for (const lineIdx in lines) {
      const rawLine: string = lines?.[lineIdx] || '';
      if (!hasActivity && rawLine.startsWith('# Activity')) {
        hasActivity = true;
      }
      else if (hasActivity) {
        // const line = rawLine.replace(/[^a-zA-Z0-9 \-\[\]]/g, '');
        const testLine = rawLine.match(hasActivityRegex);
        // Is Valid Activity
        if (testLine) {
          // Parse Out Fields
          const completed = rawLine.match(hasCompletedActivityRegex);
          const name = rawLine.replace(hasActivityRegex, '').trim();
          let duration = parseDuration(rawLine);
          // Removed Date.now() addition relative to original

          // Mark Active Idx
          if (!completed && !hasPrimeActivity) {
            hasPrimeActivity = true;
            setPrimeIdx(activityId);
          }

          activities.push({
            id: activityId.toString(),
            name: name,
            duration: duration,
            completed: completed ? true : false,
            lineIdx: lineIdx
          });
          activityId++;
        }
        else if (rawLine === '') {
          return activities
        }
        else {
          console.log("Invalid Activity: " + rawLine, testLine)
        }
      }
    }

    return activities;
  }, [content]);

  const [activityEndTime, setActivityEndTime] = React.useState<number | null>(null);
  const [timeLeft, setTimeLeft] = React.useState<number>(0);
  const [isPaused, setIsPaused] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!activityEndTime) {
      setTimeLeft(0);
      return;
    }
    // Update immediately
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, activityEndTime - now);
      setTimeLeft(remaining);
      return remaining;
    };

    updateTimer();

    const interval = setInterval(() => {
      if (isPaused) return;
      const remaining = updateTimer();
      if (remaining <= 0) {
        resetTimer()
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [activityEndTime, isPaused]);


  const resetTimer = React.useCallback(() => {
    // Reset timer when switching activities
    setActivityEndTime(null);
    setTimeLeft(0);
    setIsPaused(false);
  }, [])

  const handleNextActivity = () => {
    if (activities && primeIdx >= 0 && primeIdx < activities.length) {
      // Mark current activity as complete
      const currentActivity = activities[primeIdx];
      if (onActivityComplete && currentActivity) {
        // Optimistically move to next activity locally
        // Although the callback will likely trigger a prop update via file watch
        if (primeIdx < activities.length - 1) {
          setPrimeIdx(primeIdx + 1);
        }

        onActivityComplete(parseInt(currentActivity.lineIdx));
      } else {
        // Fallback behavior if no callback provided
        if (primeIdx < activities.length - 1) {
          setPrimeIdx(primeIdx + 1);
        }
      }
      resetTimer()
    }
  };

  return (
    <div className="obsidian-react-view">
      <div className="view-header">
        <h3>{fileName ? "Viewing: " + fileName : "No Active File"}</h3>
      </div>
      <div className="view-content">
        {activities ? (
          <>
            {/* Header */}
            <div className="timer-progress-bar-container">
              {activities[primeIdx]?.duration && (
                <div style={{ backgroundColor: "var(--background-modifier-border)", width: '100%', height: 20 }}>
                  <div
                    className="timer-progress-bar"
                    style={{ width: (timeLeft / activities[primeIdx].duration) * 100 + "%" }}
                  />
                </div>
              )}
              {timeLeft === 0 && (
                <div style={{ padding: 10 }}>
                  <button onClick={handleNextActivity}>Next Activity ({primeIdx + 1 + "/" + (activities.length)})</button>
                </div>
              )}
            </div>
            {/* Main Content */}
            <div className="timer-container">
              {activities?.[primeIdx] && (
                <div>
                  <h1 className="timer-activity-name">{activities[primeIdx].name}</h1>
                  {activities[primeIdx].duration && (
                    <div className="timer-display-container">
                      {timeLeft > 0 ? (
                        <>
                          <div onClick={() => {
                            setIsPaused(e => {
                              if (e) {
                                setActivityEndTime(Date.now() + timeLeft);
                              }
                              return !e
                            })
                          }} className="timer-display">
                            {formatTime(timeLeft)}
                            {isPaused && (
                              < div className="play-pause" />
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="timer-controls">
                          <button onClick={() => {
                            // @ts-ignore
                            setActivityEndTime(Date.now() + activities[primeIdx].duration);
                            setIsPaused(false);
                          }}>Start Activity</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p className="no-file-text">Open a markdown file to see its content here.</p>
          </div>
        )}
      </div>
    </div>
  );
};
