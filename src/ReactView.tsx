import * as React from "react";

interface ReactViewProps {
  content: string | null;
  fileName: string | null;
}

interface Activity {
  id: string;
  name: string;
  duration?: number;
  endTime?: number;
  completed: boolean
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

export const ReactView = ({ content, fileName }: ReactViewProps) => {
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
    for (const rawLine of lines) {
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
          if (duration) {
            duration += Date.now();
          }

          // Mark Active Idx
          if (!completed && !hasPrimeActivity) {
            hasPrimeActivity = true;
            setPrimeIdx(activityId);
          }

          activities.push({
            id: activityId.toString(),
            name: name,
            duration: duration,
            completed: completed ? true : false
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
                <div style={{ width: "100%", height: "20px", backgroundColor: "var(--interactive-accent)" }} />
              </div>
            )}
            <div style={{ width: "100%", height: "90vh", overflow: "auto", position: "relative" }}>
              {activities?.[primeIdx] && (
                <div>
                  <h1 style={{ textAlign: "center" }}>{activities[primeIdx].name}</h1>
                </div>
              )}
              <div style={{ width: "100%", display: "flex", justifyContent: "end", position: "fixed", bottom: 0, right: 0, paddingBottom: "40px", paddingRight: "20px" }}>
                <button onClick={() => {
                  if (primeIdx < activities.length - 1) {
                    setPrimeIdx(primeIdx + 1);
                  }
                }}>Next Activity</button>
              </div>
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
