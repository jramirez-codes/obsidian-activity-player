import * as React from "react";

interface ReactViewProps {
  content: string | null;
  fileName: string | null;
}

interface Activity {
  id: string;
  name: string;
  duration?: number;
  completed: boolean
}

export const ReactView = ({ content, fileName }: ReactViewProps) => {

  const activities: Activity[] | null = React.useMemo(() => {
    if (!content) {
      return null;
    }

    let hasActivity = false;
    let activityId = 0;
    let activities: Activity[] = [];
    const hasActivityRegex = new RegExp(/^ *- *\[[\ |x|X]\]/gm)
    const hasCompletedActivityRegex = new RegExp(/^ *- *\[[x|X]\]/gm)
    const lines = content.split('\n')
    for (const rawLine of lines) {
      if (!hasActivity && rawLine.startsWith('# Activity')) {
        hasActivity = true;
      }
      else if (hasActivity) {
        const line = rawLine.replace(/[^a-zA-Z0-9 \-\[\]]/g, '');;
        // Is Valid Activity
        if (!hasActivityRegex.test(line)) {
          const completed = hasCompletedActivityRegex.test(line);
          const name = line.replace("- ", "").replace("[x]", "").replace("[ ]", "").trim();
          activities.push({
            id: activityId.toString(),
            name: name,
            duration: undefined,
            completed: completed
          });
          activityId++;
        }
        else if (line === '') {
          return activities
        }
        else {
          console.log("Invalid Activity: " + line, hasActivityRegex.test(line))
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
            <div style={{ width: "100%", height: "100vh", overflow: "auto", position: "relative" }}>
              {JSON.stringify(activities)}
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
