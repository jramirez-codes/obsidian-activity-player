import * as React from "react";
import { parseDuration } from "./lib/parseDuration";
import { formatTime } from "./lib/formatTime";

interface ReactViewProps {
  content: string | null;
  fileName: string | null;
  onActivityComplete?: (lineIdx: number) => void;
  onReset?: () => void;
}

interface Activity {
  id: string;
  name: string;
  duration?: number;
  completed: boolean,
  lineIdx: string
}

export const ReactView = ({ content, fileName, onActivityComplete, onReset }: ReactViewProps) => {
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

  const allCompleted = React.useMemo(() => {
    return activities && activities.length > 0 && activities.every(a => a.completed);
  }, [activities]);

  const [activityEndTime, setActivityEndTime] = React.useState<number | null>(null);
  const [activityComplete, setActivityComplete] = React.useState(false)
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
        setActivityComplete(true)
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [activityEndTime, isPaused]);

  React.useEffect(() => {
    if (activities?.[primeIdx]?.duration) {
      setActivityComplete(false)
    }
    else {
      setActivityComplete(true)
    }

  }, [primeIdx])


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

  const handleReset = () => {
    if (onReset) {
      onReset();
      setPrimeIdx(0);
    }
  };

  const prevActivity = activities && primeIdx > 0 ? activities[primeIdx - 1] : null;
  const nextActivity = activities && primeIdx < activities.length - 1 ? activities[primeIdx + 1] : null;

  return (
    <div className="obsidian-react-view">
      <div className="view-header">
        <h3>{fileName ? "Viewing: " + fileName : "No Active File"}</h3>
      </div>
      <div className="view-content">
        {activities ? (
          <>
            {allCompleted ? (
              <div style={{ textAlign: 'center' }}>
                <h2>All activities completed!</h2>
                <button onClick={handleReset}>Reset Activities</button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="timer-progress-bar-container" style={{ position: 'relative' }}>
                  {activities[primeIdx]?.duration && (
                    <div style={{ width: '100%', height: '100%', position: 'absolute', zIndex: 10, top: 0 }}>
                      <div
                        className="timer-progress-bar"
                        style={{ width: (timeLeft / activities[primeIdx].duration) * 100 + "%" }}
                      />
                    </div>
                  )}
                  <div style={{ padding: 10, zIndex: 1000, position: 'relative' }}>
                    {activityComplete && (
                      <button onClick={handleNextActivity}>Next Activity ({primeIdx + 1 + "/" + (activities.length)})</button>
                    )}
                    {timeLeft === 0 && activities[primeIdx]?.duration && !activityComplete && (
                      <button onClick={() => {
                        // @ts-ignore
                        setActivityEndTime(Date.now() + activities[primeIdx].duration);
                        setIsPaused(false);
                      }}>Start Activity</button>
                    )}
                    {timeLeft > 0 && (
                      <button onClick={() => {
                        setIsPaused(e => {
                          if (e) {
                            setActivityEndTime(Date.now() + timeLeft);
                          }
                          return !e
                        })
                      }} >
                        {formatTime(timeLeft)}
                      </button>
                    )}
                  </div>
                </div>
                {/* Main Content */}
                <div className="content-container">
                  {activities?.[primeIdx] && (
                    <div>
                      <h1 className="timer-activity-name">{activities[primeIdx].name}</h1>
                    </div>
                  )}
                </div>
                <div className="activity-nav-container">
                  <div className="activity-nav-item">
                    {prevActivity && (
                      <>
                        <span className="activity-nav-label">Previous</span>
                        <span className="activity-nav-name">{prevActivity.name}</span>
                      </>
                    )}
                  </div>
                  <div className="activity-nav-item next">
                    {nextActivity && (
                      <>
                        <span className="activity-nav-label">Next</span>
                        <span className="activity-nav-name">{nextActivity.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="empty-state">
            <p className="no-file-text">Open a markdown file to see its content here.</p>
          </div>
        )}
      </div>
    </div >
  );
};
