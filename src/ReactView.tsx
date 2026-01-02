import * as React from "react";

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


// Parse duration from format: "- [ ] 15s Rest"
function parseDuration(text: string): number | undefined {
  // Match pattern: optional "- [ ]" followed by number and time unit
  const match = text.match(/(?:-\s*\[\s*\]\s*)?(\d+)\s*([smh])/i);

  if (!match) {
    return undefined;
  }

  // @ts-ignore
  const value = parseInt(match[1], 10);
  // @ts-ignore
  const unit = match[2].toLowerCase();

  // Convert to milliseconds
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 3600 * 1000;
    default:
      return undefined;
  }
}

function formatTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
  const [activityStartTime, setActivityStartTime] = React.useState<number | null>(null);
  const [timeLeft, setTimeLeft] = React.useState<number>(0);

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
      const remaining = updateTimer();
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [activityEndTime]);

  React.useEffect(() => {
    // Reset timer when switching activities
    setActivityEndTime(null);
    setTimeLeft(0);
  }, [primeIdx]);

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
            {activities[primeIdx]?.duration && (
              <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
                <div style={{ width: (timeLeft / ((activityEndTime ?? 0) - (activityStartTime ?? 0))) * 100 + "%", height: "20px", backgroundColor: "var(--interactive-accent)" }} />
              </div>
            )}
            <div style={{ width: '100%', height: "90vh", overflow: "auto", position: "relative", justifyContent: "center" }}>
              {activities?.[primeIdx] && (
                <div>
                  <h1 style={{ textAlign: "center" }}>{activities[primeIdx].name}</h1>
                  {activities[primeIdx].duration && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                      {timeLeft > 0 ? (
                        <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
                          {formatTime(timeLeft)}
                        </div>
                      ) : (
                        <button onClick={() => {
                          // @ts-ignore
                          setActivityEndTime(Date.now() + activities[primeIdx].duration);
                          setActivityStartTime(Date.now());
                        }}>Start Activity</button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {timeLeft === 0 && (
                <div style={{ width: "100%", display: "flex", justifyContent: "end", position: "fixed", bottom: 0, right: 0, paddingBottom: "40px", paddingRight: "20px" }}>
                  <button onClick={handleNextActivity}>Next Activity</button>
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
