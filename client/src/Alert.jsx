function Alert({ alert, highlightAreas = [] }) {
  const formatTime = (timestamp) => {
    // Add 'Z' to indicate UTC if not present
    const utcTimestamp = timestamp.includes('Z') ? timestamp : timestamp + 'Z';
    const date = new Date(utcTimestamp);
    return date.toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSourceClass = (source) => {
    if (source.includes('פיקוד העורף')) return 'source-oref';
    if (source.includes('Ynet')) return 'source-ynet';
    if (source.includes('Walla')) return 'source-walla';
    if (source.includes('Fox')) return 'source-fox';
    if (source.includes('כאן')) return 'source-kan';
    return 'source-other';
  };

  const getLink = () => {
    if (!alert.raw_data) return null;
    try {
      const data = JSON.parse(alert.raw_data);
      return data.link || null;
    } catch {
      return null;
    }
  };

  // Check if this is a Pikud HaOref alert or red alert - always highlight these
  const isHighlighted = () => {
    return alert.source.includes('פיקוד העורף') || alert.content.includes('צבע אדום');
  };

  // Get matching area names for display
  const getMatchingAreas = () => {
    if (!alert.source.includes('פיקוד העורף') && !alert.content.includes('צבע אדום')) return [];
    const contentLower = alert.content.toLowerCase();
    return highlightAreas.filter(area => contentLower.includes(area));
  };

  const link = getLink();
  const highlighted = isHighlighted();
  const matchingAreas = getMatchingAreas();

  return (
    <div className={`alert ${getSourceClass(alert.source)} ${highlighted ? 'highlighted' : ''}`}>
      {highlighted && (
        <div className="highlight-badge">
          {matchingAreas.length > 0 ? `באזור שלך: ${matchingAreas.join(', ')}` : 'צבע אדום'}
        </div>
      )}
      <div className="alert-time">{formatTime(alert.timestamp)}</div>
      <div className="alert-content">{alert.content}</div>
      <div className="alert-footer">
        <span className="alert-source">{alert.source}</span>
        {link && (
          <a href={link} target="_blank" rel="noopener noreferrer" className="alert-link">
            לכתבה המלאה
          </a>
        )}
      </div>
    </div>
  );
}

export default Alert;
