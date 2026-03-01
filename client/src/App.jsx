import { useState, useEffect, useMemo } from 'react';
import Alert from './Alert';

const REFRESH_INTERVAL = 10000; // 10 seconds

function App() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [areas, setAreas] = useState(() => {
    return localStorage.getItem('preferredAreas') || '';
  });
  const [filterByArea, setFilterByArea] = useState(() => {
    return localStorage.getItem('filterByArea') === 'true';
  });
  const [saved, setSaved] = useState(false);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setAlerts(data);
      setError(null);
    } catch (err) {
      setError('שגיאה בטעינת ההתראות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const handleAreasChange = (e) => {
    const value = e.target.value;
    setAreas(value);
    setSaved(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      localStorage.setItem('preferredAreas', areas);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleFilterToggle = () => {
    const newValue = !filterByArea;
    setFilterByArea(newValue);
    localStorage.setItem('filterByArea', newValue.toString());
  };

  // Parse areas into array for matching
  const areasList = areas
    .split(',')
    .map(a => a.trim().toLowerCase())
    .filter(a => a.length > 0);

  // Get top 10 cities from red alert notifications (from Feb 28th onwards)
  const topCities = useMemo(() => {
    const cityCount = {};
    const startDate = new Date('2025-02-28T00:00:00');

    alerts
      .filter(a => {
        const alertDate = new Date(a.timestamp);
        return alertDate >= startDate &&
               (a.source.includes('פיקוד העורף') || a.content.includes('צבע אדום'));
      })
      .forEach(alert => {
        // Extract city names from content
        let content = alert.content;

        // Remove "צבע אדום" prefix and time if present
        content = content.replace(/צבע אדום\s*\([^)]*\)\s*:?\s*/g, '');

        const cities = content.split(/[,،]/);

        cities.forEach(city => {
          const cleanCity = city.trim();
          if (cleanCity.length > 2 && cleanCity.length < 30 && !cleanCity.includes('צבע אדום')) {
            cityCount[cleanCity] = (cityCount[cleanCity] || 0) + 1;
          }
        });
      });

    return Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [alerts]);

  const maxCount = topCities.length > 0 ? topCities[0][1] : 1;

  // Filter alerts if needed
  const filteredAlerts = useMemo(() => {
    let result = alerts;

    if (filterByArea && areasList.length > 0) {
      result = alerts.filter(alert => {
        // Always show non-Pikud HaOref alerts
        if (!alert.source.includes('פיקוד העורף') && !alert.content.includes('צבע אדום')) {
          return true;
        }
        // Filter red alerts by area
        const contentLower = alert.content.toLowerCase();
        return areasList.some(area => contentLower.includes(area));
      });
    }

    // Keep chronological order but avoid more than 2 consecutive alerts from same source
    const spreadAlerts = [...result];

    for (let i = 2; i < spreadAlerts.length; i++) {
      // If 3 consecutive from same source, find nearest different source to swap
      if (spreadAlerts[i].source === spreadAlerts[i-1].source &&
          spreadAlerts[i].source === spreadAlerts[i-2].source) {
        // Look ahead for different source
        for (let j = i + 1; j < Math.min(i + 5, spreadAlerts.length); j++) {
          if (spreadAlerts[j].source !== spreadAlerts[i].source) {
            // Swap
            [spreadAlerts[i], spreadAlerts[j]] = [spreadAlerts[j], spreadAlerts[i]];
            break;
          }
        }
      }
    }

    return spreadAlerts;
  }, [alerts, filterByArea, areasList]);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="settings-panel">
          <label htmlFor="areas">איזה אזורים מעניינים אותך?</label>
          <div className="input-wrapper">
            <input
              type="text"
              id="areas"
              placeholder="תל אביב, חיפה, באר שבע"
              value={areas}
              onChange={handleAreasChange}
              onKeyDown={handleKeyDown}
            />
            {saved && <span className="saved-badge">נשמר!</span>}
          </div>
          <small>הפרד בפסיקים ולחץ Enter</small>

          <div className="filter-toggle">
            <label>
              <input
                type="checkbox"
                checked={filterByArea}
                onChange={handleFilterToggle}
              />
              <span>הצג רק התראות מהאזור שלי</span>
            </label>
          </div>
        </div>

        {topCities.length > 0 && (
          <div className="chart-panel">
            <h3>10 הערים עם הכי הרבה התראות</h3>
            <div className="chart">
              {topCities.map(([city, count]) => (
                <div key={city} className="chart-row">
                  <span className="chart-label">{city}</span>
                  <div className="chart-bar-container">
                    <div
                      className="chart-bar"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                    <span className="chart-count">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      <main className="main-content">
        <header>
          <h1>התראות ישראל-איראן</h1>
          <p className="subtitle">עדכונים בזמן אמת</p>
        </header>

        {loading && <div className="loading">טוען...</div>}

        {error && <div className="error">{error}</div>}

        {!loading && filteredAlerts.length === 0 && (
          <div className="empty">
            {filterByArea && areasList.length > 0
              ? 'אין התראות מהאזור שלך כרגע'
              : 'אין התראות כרגע'}
          </div>
        )}

        <div className="alerts-list">
          {filteredAlerts.map((alert) => (
            <Alert
              key={alert.id}
              alert={alert}
              highlightAreas={areasList}
            />
          ))}
        </div>

        <footer>
          <p>מתעדכן אוטומטית כל 10 שניות | {alerts.length} התראות סה"כ</p>
        </footer>
      </main>
    </div>
  );
}

export default App;
