import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * MedLoad Home (Vite/React)
 * - Full width desktop layout
 * - More vibrant design
 * - Modal for clinic details (no JSON tab)
 * - Polls /loads every 60s
 */

export default function Home() {
  const API_BASE_URL = "https://52x01kpdfk.execute-api.us-east-1.amazonaws.com/prod";

  const [data, setData] = useState(null); // { recommendedClinicId, items: [] }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("wait"); // wait | score | occupancy
  const [onlyUnder20, setOnlyUnder20] = useState(false);

  // Modal state
  const [open, setOpen] = useState(false);
  const [selectedClinicId, setSelectedClinicId] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [details, setDetails] = useState(null); // item for clinic

  // Forecasts (modal)
  const [hourlyForecast, setHourlyForecast] = useState(null); // { bestVisit, points[] }
  const [weeklyProfile, setWeeklyProfile] = useState(null);   // { points[] }

  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState("");

  const lastFetchAtRef = useRef(null);

  const [hoveredCard, setHoveredCard] = React.useState(null);

  async function fetchLoads({ silent = false } = {}) {
    if (!silent) setRefreshing(true);
    setError("");

    try {
      const url = `${API_BASE_URL}/loads`;
      const res = await fetch(url);

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${txt ? ` - ${txt}` : ""}`);
      }

      const json = await res.json();
      const safe = {
        recommendedClinicId: json?.recommendedClinicId ?? null,
        items: Array.isArray(json?.items) ? json.items : [],
      };

      setData(safe);
      lastFetchAtRef.current = new Date();
    } catch (e) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }
  async function fetchClinicDetails(clinicId) {
    if (!clinicId) return;

    setDetailsLoading(true);
    setDetailsError("");

    try {
      const url = `${API_BASE_URL}/loads/${encodeURIComponent(clinicId)}`;
      const res = await fetch(url);

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${txt ? ` - ${txt}` : ""}`);
      }

      const raw = await res.json();
      const latest = normalizeLatestLoad(raw);

      if (!latest?.Timestamp) {
        throw new Error("השרת החזיר מדדים לא תקינים");
      }

      setDetails((prev) => {
        // אם אין prev (לא אמור לקרות במודאל פתוח) – ניצור עטיפה מינימלית
        const prevObj = prev && typeof prev === "object" ? prev : {};
        return {
          ...prevObj,
          clinic: prevObj.clinic,   // לא נוגעים בפרטים כלליים
          latest: latest,           // רק מדדים
        };
      });
    } catch (e) {
      setDetailsError(e?.message || "Failed to refresh metrics");
      // לא מאפסים details
    } finally {
      setDetailsLoading(false);
    }
  }


  async function fetchForecasts(clinicId) {
    if (!clinicId) return;

    setForecastLoading(true);
    setForecastError("");

    try {
      const [hourlyRes, weeklyRes] = await Promise.all([
        fetch(`${API_BASE_URL}/forecast/hourly/${encodeURIComponent(clinicId)}`),
        fetch(`${API_BASE_URL}/forecast/weekly/${encodeURIComponent(clinicId)}`),
      ]);

      if (!hourlyRes.ok) {
        const txt = await hourlyRes.text().catch(() => "");
        throw new Error(`Hourly forecast HTTP ${hourlyRes.status}${txt ? ` - ${txt}` : ""}`);
      }
      if (!weeklyRes.ok) {
        const txt = await weeklyRes.text().catch(() => "");
        throw new Error(`Weekly profile HTTP ${weeklyRes.status}${txt ? ` - ${txt}` : ""}`);
      }

      const hourlyJson = await hourlyRes.json();
      const weeklyJson = await weeklyRes.json();

      setHourlyForecast(hourlyJson || null);
      setWeeklyProfile(weeklyJson || null);
    } catch (e) {
      setForecastError(e?.message || "Failed to load forecasts");

    } finally {
      setForecastLoading(false);
    }
  }



  // initial fetch + polling every 60 seconds
  useEffect(() => {
    fetchLoads({ silent: true });

    const id = setInterval(() => {
      fetchLoads({ silent: true });
    }, 60_000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close modal on ESC
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const lastUpdatedText = useMemo(() => {
    const ts = data?.items?.map((x) => x?.latest?.Timestamp).filter(Boolean);
    if (!ts || ts.length === 0) {
      const lf = lastFetchAtRef.current;
      return lf ? formatRelative(lf) : "--";
    }

    const maxDate = ts
      .map((t) => toDateSafe(t))
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (maxDate) return formatRelative(maxDate);

    const lf = lastFetchAtRef.current;
    return lf ? formatRelative(lf) : "--";
  }, [data]);
  const recommended = useMemo(() => {
    if (!data?.items?.length) return null;

    const items = data.items;

    // קודם כל מרפאות פתוחות
    const openItems = items.filter(
      (x) => isClinicOpenNow(x?.clinic?.OpeningHoursRule) === true
    );

    const pool = openItems.length ? openItems : items;

    // אם השרת הציע מרפאה – ניקח אותה רק אם היא בתוך ה-pool
    const recId = data?.recommendedClinicId;
    if (recId) {
      const byId = pool.find((x) => x?.clinic?.ClinicId === recId);
      if (byId) return byId;
    }

    // אחרת: הכי פחות המתנה
    return (
      [...pool].sort((a, b) => {
        const wa = a?.latest?.Timestamp ? num(a?.latest?.EstimatedWaitMin, Infinity) : Infinity;
        const wb = b?.latest?.Timestamp ? num(b?.latest?.EstimatedWaitMin, Infinity) : Infinity;
        return wa - wb;
      })[0] ?? null
    );
  }, [data]);


  const filteredSorted = useMemo(() => {
    const items = Array.isArray(data?.items) ? data.items : [];
    const q = search.trim().toLowerCase();

    let out = items.filter((row) => {
      if (!row) return false;

      const clinic = row.clinic || {};
      const latest = row.latest || {};

      const haystack = `${clinic.ClinicName ?? ""} ${clinic.City ?? ""} ${clinic.HMO ?? ""} ${clinic.Address ?? ""}`
        .toLowerCase();

      if (q && !haystack.includes(q)) return false;

      if (onlyUnder20) {
        // חייבים להיות פתוחים עכשיו כדי להיכנס למסנן "עד 20 דק׳"
        const openNow = isClinicOpenNow(clinic?.OpeningHoursRule);
        if (openNow !== true) return false;

        // חייב להיות גם latest תקין
        if (!latest?.Timestamp) return false;

        const w = num(latest?.EstimatedWaitMin, Infinity);
        if (w > 20) return false;
      }
      return true;

    });

    out.sort((a, b) => {
      const openA = isClinicOpenNow(a?.clinic?.OpeningHoursRule) === true;
      const openB = isClinicOpenNow(b?.clinic?.OpeningHoursRule) === true;

      // 1) פתוחות קודם
      if (openA !== openB) return openA ? -1 : 1;

      // 2) אם שתיהן סגורות — לא להשתמש במדדים בכלל
      if (!openA && !openB) {
        const nameA = (a?.clinic?.ClinicName || a?.clinic?.ClinicId || "").toLowerCase();
        const nameB = (b?.clinic?.ClinicName || b?.clinic?.ClinicId || "").toLowerCase();
        return nameA.localeCompare(nameB);
      }

      // 3) שתיהן פתוחות: שיש latest קודם
      const hasA = !!a?.latest?.Timestamp;
      const hasB = !!b?.latest?.Timestamp;
      if (hasA !== hasB) return hasA ? -1 : 1;

      const la = a.latest || {};
      const lb = b.latest || {};

      if (sortBy === "score") return num(la.LoadScore, Infinity) - num(lb.LoadScore, Infinity);
      if (sortBy === "occupancy") return pctNumber(la.Occupancy) - pctNumber(lb.Occupancy);
      return num(la.EstimatedWaitMin, Infinity) - num(lb.EstimatedWaitMin, Infinity);
    });



    return out;
  }, [data, search, sortBy, onlyUnder20]);

  function openModal(clinicId) {
    setSelectedClinicId(clinicId);

    const fromList = (data?.items || []).find((x) => x?.clinic?.ClinicId === clinicId) || null;
    setDetails(fromList);

    setOpen(true);
    fetchForecasts(clinicId);

    // בשלב הזה לא עושים fetch נוסף (המידע כבר בתוך /loads)
    // fetchClinicDetails(clinicId);
  }

  function closeModal() {
    setOpen(false);
    setSelectedClinicId(null);
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(false);

    setHourlyForecast(null);
    setWeeklyProfile(null);
    setForecastError("");
    setForecastLoading(false);

  }

  function loadLabel(score) {
    const s = num(score, null);
    if (s === null) return { label: "לא ידוע", tone: "neutral" };
    if (s <= 33) return { label: "נמוך", tone: "good" };
    if (s <= 66) return { label: "בינוני", tone: "warn" };
    return { label: "גבוה", tone: "bad" };
  }

  return (
    <div style={styles.page}>
      <div style={styles.bgBlob1} />
      <div style={styles.bgBlob2} />

      <div style={styles.shell}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.brand}>
            <div style={styles.logo}>ML</div>
            <div>
              <div style={styles.hTitle}>MedLoad</div>
              <div style={styles.hSub}>בדיקת עומס לפני שיוצאים • נתונים מתעדכנים אוטומטית</div>
            </div>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.updatedPill}>
              עודכן: <b>{lastUpdatedText}</b>
            </div>

            <button
              onClick={() => fetchLoads()}
              disabled={refreshing || loading}
              style={{
                ...styles.refreshBtn,
                opacity: refreshing || loading ? 0.65 : 1,
                cursor: refreshing || loading ? "not-allowed" : "pointer",
              }}
            >
              {refreshing ? "מרענן..." : "רענון"}
            </button>
          </div>
        </header>

        {/* Content */}
        {loading ? (
          <div style={styles.panel}>
            <Skeleton />
          </div>
        ) : error ? (
          <div style={{ ...styles.panel, borderColor: "rgba(239,68,68,0.45)" }}>
            <div style={styles.panelTitle}>לא הצלחנו לטעון נתונים</div>
            <div style={styles.muted}>{error}</div>
            <div style={{ marginTop: 12 }}>
              <button style={styles.refreshBtn} onClick={() => fetchLoads()}>
                נסה שוב
              </button>
            </div>
          </div>
        ) : !data?.items?.length ? (
          <div style={styles.panel}>
            <div style={styles.panelTitle}>עדיין אין מספיק נתונים</div>
            <div style={styles.muted}>נסי שוב בעוד כמה דקות (EventBridge מייצר נתונים באופן מחזורי).</div>
            <div style={{ marginTop: 12 }}>
              <button style={styles.refreshBtn} onClick={() => fetchLoads()}>
                רענון
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Top row: Recommended + Filters */}
            <div style={styles.topGrid}>
              {/* Recommended card */}
              <section style={styles.recoCard}>
                <div style={styles.recoHeader}>
                  <div style={styles.recoBadge} > הכי מומלץ עכשיו ⭐ </div>
                  {recommended ? (
                    <div>
                      <div style={styles.recoClinic}>
                        {recommended?.clinic?.ClinicName || recommended?.clinic?.ClinicId}
                      </div>

                      <div style={styles.recoMeta}>
                        {recommended?.clinic?.City || "—"} • {recommended?.clinic?.HMO || "—"}
                      </div>

                      {(() => {
                        const openNow = isClinicOpenNow(recommended?.clinic?.OpeningHoursRule);
                        if (openNow === null) return null;

                        return (
                          <div style={{ marginTop: 8 }}>
                            <span
                              style={{
                                ...styles.openStatusBadge,
                                ...openStatusStyle(openNow),
                              }}
                            >
                              {openNow ? "🟢 פתוח עכשיו" : "🔴 סגור עכשיו"}
                            </span>
                          </div>

                        );
                      })()}
                    </div>
                  ) : (
                    <div style={styles.recoClinic}>—</div>
                  )}

                </div>

                {recommended ? (
                  <>
                    <div style={styles.recoMain}>
                      <div style={styles.bigWait}>
                        {(() => {
                          const openNow = isClinicOpenNow(recommended?.clinic?.OpeningHoursRule);

                          if (openNow !== true) {
                            return "—";
                          }

                          return (
                            <>
                              {num(recommended?.latest?.EstimatedWaitMin, "--")}
                              <span style={styles.bigWaitUnit}>דק׳</span>
                            </>
                          );
                        })()}
                      </div>

                      <div style={styles.bigWaitSub}>המתנה משוערת</div>

                      <div style={styles.kpis}>
                        <Kpi
                          label="תפוסה"
                          value={`${pct(recommended?.latest?.Occupancy)}%`}
                          tone={toneByOccupancy(pctNumber(recommended?.latest?.Occupancy))}
                        />
                        <Kpi
                          label="עומס"
                          value={loadLabel(recommended?.latest?.LoadScore).label}
                          tone={loadLabel(recommended?.latest?.LoadScore).tone}

                        />
                      </div>
                    </div>

                    <div style={styles.recoActions}>
                      <button style={styles.primary} onClick={() => openModal(recommended?.clinic?.ClinicId)}>
                        פרטים
                      </button>

                    </div>
                  </>
                ) : (
                  <div style={styles.muted}>אין המלצה זמינה כרגע</div>
                )}
              </section>

              {/* Filters */}
              <section style={styles.filtersCard}>
                <div style={styles.filtersTitle}>סינון ומיון</div>

                <div style={styles.filtersRow}>
                  <input
                    style={styles.search}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="חפש מרפאה לפי שם / עיר / קופה"

                  />
                  <div style={styles.selectWrap}>
                    <select
                      style={styles.select}
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="wait" style={styles.optionDark}>מיון: המתנה</option>
                      <option value="occupancy" style={styles.optionDark}>מיון: תפוסה</option>
                      <option value="score" style={styles.optionDark}>מיון: עומס (LoadScore)</option>
                    </select>

                    <span style={styles.selectChevron}>▾</span>
                  </div>

                </div>

                <label style={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={onlyUnder20}
                    onChange={(e) => setOnlyUnder20(e.target.checked)}
                  />
                  <span style={{ marginInlineStart: 10 }}>רק מרפאות עד 20 דק׳ המתנה</span>
                </label>

                <div style={styles.legend}>
                  <LegendDot color="rgba(34,197,94,1)" text="עומס נמוך" />
                  <LegendDot color="rgba(245,158,11,1)" text="עומס בינוני" />
                  <LegendDot color="rgba(239,68,68,1)" text="עומס גבוה" />
                </div>
              </section>
            </div>

            {/* Grid list */}
            <section style={{ marginTop: 44 }}>
              <div style={styles.sectionTitle}>השוואת מרפאות</div>

              <div style={styles.cardsGrid}>
                {filteredSorted.map((c) => {
                  const load = loadLabel(c?.latest?.LoadScore);
                  const occ = pctNumber(c?.latest?.Occupancy);
                  const openNow = isClinicOpenNow(c?.clinic?.OpeningHoursRule);


                  return (
                    <button
                      key={`${c?.clinic?.ClinicId}-${String(c?.latest?.Timestamp ?? "")}`}
                      onMouseEnter={() => setHoveredCard(c?.clinic?.ClinicId)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        ...styles.cardBtn,
                        border:
                          hoveredCard === c?.clinic?.ClinicId
                            ? "2px solid #34D399"   // צבע hover (ירקרק)
                            : styles.cardBtn.border,
                      }}
                      onClick={() => openModal(c?.clinic?.ClinicId)}
                    >

                      <div style={styles.cardHeader}>
                        <div style={styles.cardClinic}>{c?.clinic?.ClinicName}</div>
                        <div style={styles.cardMeta}>
                          {c?.clinic?.City || "—"} • {c?.clinic?.HMO || "—"}
                        </div>


                        {openNow !== null && (
                          <div style={{ marginTop: 8 }}>
                            <span
                              style={{
                                ...styles.openStatusBadge,
                                ...openStatusStyle(openNow),
                              }}
                            >
                              {openNow ? "🟢 פתוח עכשיו" : "🔴 סגור עכשיו"}
                            </span>
                          </div>

                        )}


                      </div>

                      <div style={styles.cardBody}>
                        <div style={styles.metricBlock}>
                          <div style={styles.metricValue}>
                            {(() => {
                              // 1) אין עדיין מדידות בכלל
                              if (!c?.latest?.Timestamp) {
                                return "אין נתונים";
                              }

                              // 2) יש מדידות, אבל המרפאה סגורה עכשיו
                              if (openNow !== true) {
                                return "—";
                              }

                              // 3) יש מדידות והיא פתוחה
                              return (
                                <>
                                  {num(c?.latest?.EstimatedWaitMin, "--")}
                                  <span style={styles.metricUnit}>דק׳</span>
                                </>
                              );
                            })()}
                          </div>

                          <div style={styles.metricLabel}>המתנה</div>
                        </div>

                        <div style={styles.miniGrid}>
                          <Mini
                            label="עומס"
                            value={load.label}
                            tone={load.tone}
                          />
                          <Mini label="תפוסה" value={`${pct(c?.latest?.Occupancy)}%`} tone={toneByOccupancy(occ)} />

                        </div>

                        <div style={styles.timeRow}>
                          <span style={styles.timeDot} />
                          <span style={styles.timeText}>
                            {c?.latest?.Timestamp
                              ? `עודכן: ${formatTimeShort(toDateSafe(c.latest.Timestamp))}`
                              : "אין עדיין מדידות"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Modal */}
      {open && (
        <Modal onClose={closeModal}>
          <div style={styles.modalHeader}>
            <div>
              <div style={styles.modalTitle}>פרטי מרפאה</div>



            </div>

            <div style={styles.modalActions}>
              <button
                style={styles.modalBtn}
                onClick={() => {
                  fetchClinicDetails(selectedClinicId);
                  fetchForecasts(selectedClinicId);
                }}

                disabled={detailsLoading || forecastLoading}
              >
                {detailsLoading || forecastLoading ? "טוען..." : "רענון"}
              </button>
              <button style={{ ...styles.modalBtn, ...styles.modalBtnGhost }} onClick={closeModal}>
                סגירה
              </button>
            </div>
          </div>
          {detailsError ? (
            <div style={{ ...styles.modalBox, borderColor: "rgba(239,68,68,0.45)" }}>
              <div style={styles.panelTitle}>שגיאה ברענון</div>
              <div style={styles.muted}>{detailsError}</div>
            </div>
          ) : null}

          {/* אם אין בכלל פרטים עדיין */}
          {!details ? (
            <div style={styles.modalBox}>
              <div style={styles.muted}>אין נתונים להצגה.</div>
            </div>
          ) : (
            <>

              {/* Big numbers */}
              <div style={styles.modalGrid}>
                <ModalKpi
                  title="המתנה משוערת"
                  big={(() => {
                    const hasLatest = !!details?.latest?.Timestamp;
                    if (!hasLatest) return "אין נתונים";

                    const openNow = isClinicOpenNow(details?.clinic?.OpeningHoursRule) === true;
                    if (!openNow) return "—";

                    return `${num(details?.latest?.EstimatedWaitMin, "--")} דק׳`;
                  })()}
                  hint="מדד חוויית משתמש (מה שמעניין אותך בפועל)"
                  tone="indigo"
                />

                <ModalKpi
                  title="תפוסה"
                  big={(() => {
                    const hasLatest = !!details?.latest?.Timestamp;
                    if (!hasLatest) return "אין נתונים";

                    const openNow = isClinicOpenNow(details?.clinic?.OpeningHoursRule) === true;
                    if (!openNow) return "—";

                    return `${pct(details?.latest?.Occupancy)}%`;
                  })()}
                  hint="כמה מהקיבולת בפנים בשימוש כרגע"
                  tone={(() => {
                    const openNow = isClinicOpenNow(details?.clinic?.OpeningHoursRule) === true;
                    return openNow && details?.latest?.Timestamp
                      ? toneByOccupancy(pctNumber(details?.latest?.Occupancy))
                      : "neutral";
                  })()}
                />

                <ModalKpi
                  title="LoadScore"
                  big={(() => {
                    const hasLatest = !!details?.latest?.Timestamp;
                    if (!hasLatest) return "אין נתונים";

                    const openNow = isClinicOpenNow(details?.clinic?.OpeningHoursRule) === true;
                    if (!openNow) return "—";

                    return String(num(details?.latest?.LoadScore, "--"));
                  })()}
                  hint="ציון משוקלל למידת העומס (השוואה מהירה בין מרפאות- גבוה יותר, עמוס יותר)"
                  tone={(() => {
                    const openNow = isClinicOpenNow(details?.clinic?.OpeningHoursRule) === true;
                    return openNow && details?.latest?.Timestamp
                      ? loadLabel(details?.latest?.LoadScore).tone
                      : "neutral";
                  })()}
                />
              </div>

              {/* Forecasts */}
              <div style={styles.modalBox}>
                <div style={{ ...styles.modalBoxTitle, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>📈</span>
                  <span>תחזיות עומס</span>
                </div>

                {/* שגיאה – רק הודעה, בלי למחוק תוכן */}
                {forecastError ? (
                  <div style={styles.muted}>{forecastError}</div>
                ) : null}

                <>
                  {/* Best visit */}
                  {hourlyForecast?.bestVisit ? (
                    <BestVisitCard best={hourlyForecast.bestVisit} />
                  ) : (
                    <div
                      style={{
                        ...styles.muted,
                        padding: "10px 0",
                        color: "#0b1020",
                        fontWeight: 700,
                      }}
                    >
                      אין המלצה זמינה כרגע.
                    </div>
                  )}

                  {/* Hourly bars */}
                  <div style={{ marginTop: 14 }}>
                    <div style={styles.forecastSectionTitle}>
                      תחזית לפי שעות- בהתאם לשעות פתיחה{" "}
                      <span style={styles.sectionSubTitle}>(מקסימום 12 שעות קדימה)</span>
                    </div>

                    <SimpleBars
                      data={(hourlyForecast?.points || []).map((p) => ({
                        ts: p.ts,
                        label: formatHourMinute(p.ts),
                        value: p.predictedWaitMin,
                        usedFallback: !!p.usedFallback,
                        samples: Number(p.samples) || 0,
                        sub: `המתנה חזויה: ${p.predictedWaitMin} דק׳ • LoadScore: ${p.predictedLoadScore} • דגימות: ${p.samples ?? 0}${p.usedFallback ? " • הערכה" : ""}`,
                      }))}
                    />

                    {(hourlyForecast?.points || []).some((p) => p.usedFallback) ? (
                      <div style={{ marginTop: 8, fontSize: 12, color: "rgba(11,16,32,0.6)" }}>
                        * חלק מהשעות מסומנות כ״הערכה״ כי אין מספיק נתונים היסטוריים.
                      </div>
                    ) : null}

                    {/* 👇 זה כל מה שמתווסף בזמן רענון */}
                    {forecastLoading ? (
                      <div style={{ marginTop: 8, fontSize: 12, color: "rgba(11,16,32,0.6)" }}>
                        ⏳ מעדכן נתונים…
                      </div>
                    ) : null}
                  </div>

                  {/* Weekly grid */}
                  <div style={{ marginTop: 18 }}>
                    <div style={styles.forecastSectionTitle}>
                      פרופיל שבועי <span style={styles.sectionSubTitle}>(LoadScore לפי יום/שעה)</span>
                    </div>
                    <WeeklyGrid points={weeklyProfile?.points || []} />
                  </div>
                </>
              </div>




              {/* Extra details */}
              <div style={styles.modalBox}>
                <div style={styles.modalBoxTitle}>פרטים כלליים</div>
                {(() => {
                  const openNow = isClinicOpenNow(details?.clinic?.OpeningHoursRule);
                  if (openNow === null) return null;

                  return (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ marginTop: 8 }}>
                        <span
                          style={{
                            ...styles.openStatusBadge,
                            ...openStatusStyle(openNow),
                          }}
                        >
                          {openNow ? "🟢 פתוח עכשיו" : "🔴 סגור עכשיו"}
                        </span>
                      </div>

                    </div>
                  );
                })()}
                <div style={styles.detailGrid}>
                  <DetailRow label="שם" value={details?.clinic?.ClinicName || "—"} />
                  <DetailRow label="קופה" value={details?.clinic?.HMO || "—"} />
                  <DetailRow label="עיר" value={details?.clinic?.City || "—"} />
                  <DetailRow label="כתובת" value={details?.clinic?.Address || "—"} />
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={styles.modalBoxTitle}>שעות פעילות</div>
                  <div style={styles.openingHoursText}>
                    {details?.clinic?.OpeningHoursText || "—"}
                  </div>
                </div>
                <div style={styles.note}>
                  <div style={{ marginTop: 6 }}>
                    • <b>המתנה</b> = זמן המתנה משוער (דקות).{" "}
                    • <b>תפוסה</b> = כמה בפנים עסוק (אחוז).{" "}
                    • <b>LoadScore</b> = סיכום משוקלל להשוואה מהירה.
                  </div>
                </div>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ---------------- UI Components ---------------- */

function Kpi({ label, value, tone }) {
  const bg = kpiBg(tone);
  return (
    <div style={{ ...stylesKpi.kpi, background: bg.bg, borderColor: bg.border }}>
      <div style={stylesKpi.kpiLabel}>{label}</div>
      <div style={stylesKpi.kpiValue}>{value}</div>
    </div>
  );
}

function Mini({ label, value, tone }) {
  const bg = miniBg(tone);
  return (
    <div style={{ ...stylesKpi.mini, background: bg.bg, borderColor: bg.border }}>
      <div style={stylesKpi.miniLabel}>{label}</div>
      <div style={stylesKpi.miniValue}>{value}</div>
    </div>
  );
}

function LegendDot({ color, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color }} />
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.9)" }}>{text}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div>
      <div style={{ height: 18, width: 220, background: "rgba(255,255,255,0.35)", borderRadius: 10 }} />
      <div style={{ marginTop: 10, height: 12, width: "100%", background: "rgba(255,255,255,0.25)", borderRadius: 10 }} />
      <div style={{ marginTop: 10, height: 12, width: "100%", background: "rgba(255,255,255,0.25)", borderRadius: 10 }} />
      <div style={{ marginTop: 10, height: 12, width: "70%", background: "rgba(255,255,255,0.25)", borderRadius: 10 }} />
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div style={modalStyles.overlay} onMouseDown={onClose}>
      <div
        style={{
          ...modalStyles.card,
          maxHeight: "calc(100vh - 36px)",
          overflowY: "auto",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}


function ModalKpi({ title, big, hint, tone }) {
  const bg = modalKpiBg(tone);
  return (
    <div style={{ ...modalStyles.kpi, background: bg.bg, borderColor: bg.border }}>
      <div style={modalStyles.kpiTitle}>{title}</div>
      <div style={modalStyles.kpiBig}>{big}</div>
      <div style={modalStyles.kpiHint}>{hint}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={modalStyles.detailRow}>
      <div style={modalStyles.detailLabel}>{label}</div>
      <div style={modalStyles.detailValue}>{String(value)}</div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function num(v, fallback) {
  if (v === 0) return 0;
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "--";
  if (n <= 1) return Math.round(n * 100);
  return Math.round(n);
}

function pctNumber(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return Infinity;
  if (n <= 1) return n * 100;
  return n;
}

function toDateSafe(t) {
  if (t === null || t === undefined) return null;
  if (typeof t === "number") {
    if (t < 10_000_000_000) return new Date(t * 1000);
    return new Date(t);
  }
  const s = String(t);
  const n = Number(s);
  if (Number.isFinite(n)) {
    if (n < 10_000_000_000) return new Date(n * 1000);
    return new Date(n);
  }
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function formatRelative(date) {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.max(0, Math.round(diffMs / 1000));

  if (diffSec < 15) return "לפני רגע";
  if (diffSec < 60) return `לפני ${diffSec} שנ׳`;

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `לפני ${diffMin} דק׳`;

  const diffHr = Math.round(diffMin / 60);
  return `לפני ${diffHr} ש׳`;
}

function formatTimeShort(d) {
  if (!d) return "--";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toneByOccupancy(occPct) {
  if (!Number.isFinite(occPct)) return "neutral";
  if (occPct <= 35) return "good";
  if (occPct <= 70) return "warn";
  return "bad";
}

function chipByTone(tone) {
  const map = {
    good: { background: "rgba(34,197,94,0.16)", border: "1px solid rgba(34,197,94,0.35)", color: "rgba(255, 255, 255, 1)", fontFamily: "Arial, sans-serif" },
    warn: { background: "rgba(245,158,11,0.16)", border: "1px solid rgba(245,158,11,0.35)", color: "rgba(255, 255, 255, 1)", fontFamily: "Arial, sans-serif" },
    bad: { background: "rgba(239,68,68,0.16)", border: "1px solid rgba(239,68,68,0.35)", color: "rgba(255, 255, 255, 1)", fontFamily: "Arial, sans-serif" },
    indigo: { background: "rgba(99,102,241,0.16)", border: "1px solid rgba(99,102,241,0.35)", color: "rgba(255, 255, 255, 1)", fontFamily: "Arial, sans-serif" },
    neutral: { background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", color: "rgba(255, 255, 255, 1)", fontFamily: "Arial, sans-serif" },
  };
  return map[tone] || map.neutral;
}

function kpiBg(tone) {
  const map = {
    good: { bg: "rgba(34,197,94,0.18)", border: "rgba(34,197,94,0.35)", fontFamily: "Arial, sans-serif" },
    warn: { bg: "rgba(245,158,11,0.18)", border: "rgba(245,158,11,0.35)", fontFamily: "Arial, sans-serif" },
    bad: { bg: "rgba(239,68,68,0.18)", border: "rgba(239,68,68,0.35)", fontFamily: "Arial, sans-serif" },
    neutral: { bg: "rgba(255,255,255,0.14)", border: "rgba(255,255,255,0.20)", fontFamily: "Arial, sans-serif" },
  };
  return map[tone] || map.neutral;
}

function miniBg(tone) {
  const map = {
    good: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.28)" },
    warn: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.28)" },
    bad: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.28)" },
    neutral: { bg: "rgba(255,255,255,0.10)", border: "rgba(255,255,255,0.18)" },
  };
  return map[tone] || map.neutral;
}

function modalKpiBg(tone) {
  const map = {
    good: { bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.28)" },
    warn: { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.28)" },
    bad: { bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.28)" },
    indigo: { bg: "rgba(99,102,241,0.10)", border: "rgba(99,102,241,0.28)" },
    neutral: { bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.18)" },
  };
  return map[tone] || map.neutral;
}



function isClinicOpenNow(openingHoursRule, now = new Date()) {
  if (!openingHoursRule) return null;

  // get day name in rule format (Sun/Mon/...)
  const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = dayMap[now.getDay()];

  // normalize separators: rule has ";\n" etc.
  const parts = String(openingHoursRule)
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  // find line like "Sun=08:00-12:00,16:00-19:00"
  const line = parts.find((p) => p.startsWith(dayName + "="));
  if (!line) return null;

  const rhs = line.split("=").slice(1).join("=").trim();
  if (!rhs || rhs.toLowerCase() === "closed") return false;

  const intervals = rhs.split(",").map((x) => x.trim()).filter(Boolean);

  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (const interval of intervals) {
    const [startStr, endStr] = interval.split("-").map((x) => x.trim());
    if (!startStr || !endStr) continue;

    const start = toMinutes(startStr);
    const end = toMinutes(endStr);
    if (start === null || end === null) continue;

    // normal case: 08:00-13:00
    if (start <= end) {
      if (nowMin >= start && nowMin < end) return true;
    } else {
      // rare overnight case: 22:00-02:00
      if (nowMin >= start || nowMin < end) return true;
    }
  }

  return false;
}

function WeeklyGrid({ points }) {
  const arr = Array.isArray(points) ? points : [];

  const dows = [
    { key: "Sun", label: "א׳" },
    { key: "Mon", label: "ב׳" },
    { key: "Tue", label: "ג׳" },
    { key: "Wed", label: "ד׳" },
    { key: "Thu", label: "ה׳" },
    { key: "Fri", label: "ו׳" },
    { key: "Sat", label: "ש׳" },
  ];

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const map = new Map();
  for (const p of arr) {
    if (!p?.dow) continue;
    const sc = Number(p.avgLoadScore);
    if (!Number.isFinite(sc)) continue;
    map.set(`${p.dow}-${p.hour}`, sc);
  }

  const vals = arr
    .map((p) => Number(p.avgLoadScore))
    .filter((x) => Number.isFinite(x));

  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 100;

  const cell = (score) => {
    const s = Number.isFinite(score) ? score : null;

    if (s === null) {
      return {
        background: "rgba(11,16,32,0.06)",
        border: "1px solid rgba(11,16,32,0.10)",
      };
    }

    const t = max > min ? (s - min) / (max - min) : 0.5;
    const opacity = 0.12 + t * 0.72;

    return {
      background: `rgba(11,16,32,${opacity})`,
      border: "1px solid rgba(11,16,32,0.16)",
    };
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={styles.legendRow}>
        <div style={{ fontSize: 12, color: "rgba(11,16,32,0.75)", fontWeight: 900 }}>
          מקרא:
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ ...styles.legendDot, background: "rgba(11,16,32,0.10)" }} />
          <span style={styles.legendText}>נמוך</span>
          <div style={{ ...styles.legendDot, background: "rgba(11,16,32,0.45)" }} />
          <span style={styles.legendText}>בינוני</span>
          <div style={{ ...styles.legendDot, background: "rgba(11,16,32,0.78)" }} />
          <span style={styles.legendText}>גבוה</span>
        </div>
      </div>

      {/* Force LTR so hours won’t flip in RTL */}
      <div
        style={{
          direction: "ltr",
          display: "grid",
          gridTemplateColumns: `52px repeat(24, 18px)`,
          gap: 6,
          alignItems: "center",
          padding: "6px 2px",
        }}
      >
        <div />

        {hours.map((h) => (
          <div key={h} style={styles.hourHeader}>
            {String(h).padStart(2, "0")}
          </div>
        ))}

        {dows.map((d) => (
          <React.Fragment key={d.key}>
            <div style={styles.dowHeader}>{d.label}</div>

            {hours.map((h) => {
              const key = `${d.key}-${h}`;
              const score = map.has(key) ? map.get(key) : null;

              const title =
                score === null
                  ? `${d.label} ${String(h).padStart(2, "0")}:00 — אין נתונים`
                  : `${d.label} ${String(h).padStart(2, "0")}:00 • LoadScore ${Math.round(score * 10) / 10}`;

              return (
                <div
                  key={h}
                  title={title}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 6,
                    transition: "transform 120ms ease, box-shadow 120ms ease",
                    ...cell(score),
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(11,16,32,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "rgba(11,16,32,0.65)" }}>
        ככל שהריבוע כהה יותר — עומס גבוה יותר.
      </div>
    </div>
  );
}


function normalizeLatestLoad(raw) {
  if (!raw || typeof raw !== "object") return null;

  // הלמדא מחזירה UpperCamelCase
  const ts = raw.Timestamp ?? raw.timestamp ?? null;

  const wait = raw.EstimatedWaitMin ?? raw.estimatedWaitMin ?? raw.waitMin ?? null;
  const occ = raw.Occupancy ?? raw.occupancy ?? null;
  const score = raw.LoadScore ?? raw.loadScore ?? null;

  return {
    Timestamp: ts,
    EstimatedWaitMin: wait,
    Occupancy: occ,
    LoadScore: score,
  };
}


function formatHourMinute(ts) {
  const d = toDateSafe(ts);
  if (!d) return "--:--";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toMinutes(hhmm) {
  const m = String(hhmm).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mi) || h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  return h * 60 + mi;
}
function SimpleBars({ data }) {
  const arr = Array.isArray(data) ? data : [];
  const max = Math.max(1, ...arr.map((x) => Number(x.value) || 0));

  return (
    <div style={styles.barsWrap}>
      {arr.map((d, i) => {
        const v = Number(d.value) || 0;
        const barH = Math.round((v / max) * 92) + 10;

        const isFallback = !!d.usedFallback;

        return (
          <div key={i} style={{ width: 44, textAlign: "center" }}>
            <div
              title={d.sub || String(v)}
              style={{
                height: barH,
                borderRadius: 12,
                background: isFallback ? "rgba(11,16,32,0.12)" : "rgba(11,16,32,0.20)",
                border: isFallback ? "1px dashed rgba(11,16,32,0.22)" : "1px solid rgba(11,16,32,0.14)",
                boxShadow: "none",
                transition: "transform 120ms ease, box-shadow 120ms ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 22px rgba(11,16,32,0.16)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <div style={styles.barLabel}>
              {d.label}
              {isFallback ? (
                <span
                  style={{
                    ...styles.nowTag,
                    background: "rgba(11,16,32,0.10)",
                    border: "1px dashed rgba(11,16,32,0.25)",
                  }}
                >
                  הערכה
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BestVisitCard({ best }) {
  return (
    <div style={styles.bestCardWrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={styles.bestIcon}>⭐</div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(11,16,32,0.65)" }}>
            היום מומלץ להגיע ב־
          </div>

          <div style={{ fontSize: 20, fontWeight: 950 }}>
            {formatHourMinute(best.ts)}
          </div>

          <div style={{ fontSize: 11, marginTop: 2, color: "rgba(11,16,32,0.5)" }}>
            * ההמלצה מתייחסת לשעות הקרובות ואינה כוללת את השעה הנוכחית
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={styles.bestPill}>
          ⏱️ {best.predictedWaitMin} דק׳ המתנה משוערת
        </div>
      </div>
    </div>
  );
}

function openStatusStyle(openNow) {
  return openNow
    ? {
      backgroundColor: "#15803D", // ירוק עמוק
      color: "#FFFFFF",
      border: "2px solid #166534",
      boxShadow: "0 0 0 4px rgba(21,128,61,0.15)",
    }
    : {
      backgroundColor: "#991B1B", // אדום עמוק
      color: "#FFFFFF",
      border: "2px solid #7F1D1D",
      boxShadow: "0 0 0 4px rgba(153,27,27,0.15)",
    };
}


/* ---------------- styles ---------------- */

const styles = {
  page: {
    minHeight: "100vh",
    direction: "rtl",
    fontFamily: "Arial, system-ui, -apple-system, Roboto, sans-serif",
    color: "#0b1020",
    position: "relative",
    overflowX: "hidden",
    background:
      "radial-gradient(1200px 700px at 80% -10%, rgba(99,102,241,0.35), transparent 60%)," +
      "radial-gradient(700px 500px at 10% 0%, rgba(34,197,94,0.30), transparent 55%)," +
      "linear-gradient(180deg, #0b1020 0%, #0b1020 35%, #0e1630 100%)",
  },

  bgBlob1: {
    position: "absolute",
    inset: "auto auto -220px -260px",
    width: 520,
    height: 520,
    filter: "blur(55px)",
    background: "radial-gradient(circle, rgba(245,158,11,0.35), transparent 60%)",
    pointerEvents: "none",
  },
  bgBlob2: {
    position: "absolute",
    inset: "-260px -240px auto auto",
    width: 520,
    height: 520,
    filter: "blur(55px)",
    background: "radial-gradient(circle, rgba(239,68,68,0.30), transparent 60%)",
    pointerEvents: "none",
  },

openStatusBadge: {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,                 // היה 8
  padding: "6px 12px",    // היה 8px 16px
  borderRadius: 999,
  fontFamily: "Arial, sans-serif",
  fontSize: 13,           // היה 15
  fontWeight: 800,
  letterSpacing: "0.3px", // היה 0.4px
  textTransform: "uppercase",
},

  // Full width shell
  shell: {
    width: "100%",
    margin: 0,
    padding: "26px 28px 70px",
    boxSizing: "border-box",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 18,
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 16,
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    letterSpacing: 0.5,
    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
  },
  hTitle: { color: "#fff", fontSize: 20, fontWeight: 700, lineHeight: 1.1 },
  hSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 3 },

  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  updatedPill: {
    color: "rgba(255,255,255,0.9)",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.18)",
    padding: "10px 12px",
    borderRadius: 999,
    fontSize: 13,
    backdropFilter: "blur(8px)",
  },

  refreshBtn: {
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.20)",
    background:
      "linear-gradient(180deg, rgba(99,102,241,0.95) 0%, rgba(79,70,229,0.95) 100%)",
    color: "#fff",
    fontWeight: 700,
    boxShadow: "0 12px 30px rgba(79,70,229,0.25)",
    fontFamily: "Arial, system-ui, -apple-system, Roboto, sans-serif",

  },

  panel: {
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 22,
    padding: 18,
    color: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(10px)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.25)",
  },
  panelTitle: { fontSize: 16, fontWeight: 700, marginBottom: 6, color: "#fff" },
  muted: { color: "rgba(255,255,255,0.75)", fontSize: 13 },

  topGrid: {
    display: "grid",
    gridTemplateColumns: "1.25fr 1fr",
    gap: 16,
  },

  recoCard: {
    background:
      "linear-gradient(180deg, rgba(34,197,94,0.30), rgba(16,185,129,0.18))",
    border: "2px solid rgba(52,211,153,0.75)",
    borderRadius: 24,
    padding: 20,
    backdropFilter: "blur(10px)",
    boxShadow:
      "0 22px 70px rgba(16,185,129,0.45), inset 0 0 0 1px rgba(255,255,255,0.25)",
  },
  recoHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 },
  recoBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: 14,
    letterSpacing: "0.4px",
    color: "#064E3B",
    background:
      "linear-gradient(90deg, rgba(107, 218, 166, 0.95), rgba(128, 218, 183, 0.95))",
    border: "2px solid #34D399",
    boxShadow: "0 12px 32px rgba(128, 164, 152, 0.45)",
    textTransform: "uppercase",
  },

  recoClinic: { color: "#fff", fontSize: 18, fontWeight: 700 },
  recoMain: { marginTop: 14 },
  bigWait: { color: "#fff", fontSize: 46, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1 },
  bigWaitUnit: { fontSize: 18, fontWeight: 800, marginInlineStart: 6, color: "rgba(255,255,255,0.85)" },
  bigWaitSub: { marginTop: 6, color: "rgba(255,255,255,0.75)", fontSize: 13 },

  kpis: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 },

  recoActions: { display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" },
  primary: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.22)",
    background: "linear-gradient(180deg, rgba(245,158,11,0.95) 0%, rgba(234,88,12,0.95) 100%)",
    color: "#111",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 14px 35px rgba(234,88,12,0.20)",
  },
  secondary: {
    padding: "11px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.20)",
    background: "rgba(255,255,255,0.12)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },

  filtersCard: {
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 22,
    padding: 18,
    backdropFilter: "blur(10px)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.25)",
  },
  filtersTitle: { color: "#fff", fontSize: 15, fontWeight: 700, marginBottom: 12 },
  filtersRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  search: {
    flex: "1 1 220px",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    outline: "none",
  },
  select: {
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: "#fff",
    outline: "none",
    fontWeight: 800,
  },
  selectWrap: {
    position: "relative",
    flex: "0 0 240px",
    minWidth: 220,
  },

  selectChevron: {
    position: "absolute",
    left: 12,           // כי RTL, החץ בצד שמאל נראה טבעי
    top: "50%",
    transform: "translateY(-50%)",
    pointerEvents: "none",
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: 700,
  },

  optionDark: {
    backgroundColor: "#0b1020",
    color: "#fff",
  },

  checkRow: { display: "flex", alignItems: "center", marginTop: 12, color: "rgba(255,255,255,0.86)", fontSize: 13 },
  legend: { display: "flex", gap: 14, flexWrap: "wrap", marginTop: 12 },

  sectionTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1.2,
    padding: "10px 18px",
  },


  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(280px, 1fr))",
    gap: 14,
  },

  cardBtn: {
    textAlign: "right",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.16)",
    borderRadius: 20,
    padding: 14,
    cursor: "pointer",
    color: "#fff",
    backdropFilter: "blur(10px)",
    boxShadow: "0 16px 55px rgba(0,0,0,0.22)",
    fontFamily: "Arial, sans-serif",

  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  cardClinic: { fontSize: 14, fontWeight: 700 },
  chip: {
    padding: "7px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  },
  cardBody: { marginTop: 12 },
  metricBlock: { marginBottom: 10 },
  metricValue: { fontSize: 28, fontWeight: 700, lineHeight: 1 },
  metricUnit: { fontSize: 14, fontWeight: 800, marginInlineStart: 6, color: "rgba(255,255,255,0.85)" },
  metricLabel: { marginTop: 5, fontSize: 12, color: "rgba(255,255,255,0.72)", fontWeight: 700 },

  miniGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 },
  timeRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 12 },
  timeDot: { width: 8, height: 8, borderRadius: 999, background: "rgba(99,102,241,0.95)" },
  timeText: { fontSize: 12, color: "rgba(255,255,255,0.72)" },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  modalTitle: { fontSize: 16, fontWeight: 700, color: "#0b1020" },
  modalSub: { fontSize: 13, color: "rgba(11,16,32,0.70)", marginTop: 4, fontWeight: 800 },

  modalActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  modalBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,16,32,0.12)",
    background: "rgba(11,16,32,0.06)",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "Arial, sans-serif",

  },
  modalBtnGhost: {
    background: "rgba(255,255,255,0.9)",
    fontFamily: "Arial, sans-serif",

  },

  modalGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    marginBottom: 12,
  },

  modalBox: {
    background: "rgba(11,16,32,0.03)",
    border: "1px solid rgba(11,16,32,0.10)",
    borderRadius: 16,
    padding: 14,
  },
  modalBoxTitle: { fontSize: 14, fontWeight: 700, color: "#0b1020", marginBottom: 10 },

  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },

  note: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    background: "rgba(99,102,241,0.10)",
    border: "1px solid rgba(99,102,241,0.18)",
    color: "#0b1020",
    fontSize: 12,
  },
  recoMeta: {
    marginTop: 6,
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    fontWeight: 700,
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(255,255,255,0.70)",
    fontWeight: 700,
  },
  modalMeta: {
    marginTop: 6,
    fontSize: 12,
    color: "rgba(11,16,32,0.65)",
    fontWeight: 700,
  },
  openingHoursText: {
    whiteSpace: "pre-line",
    fontSize: 13,
    fontWeight: 700,
    color: "#0b1020",
    lineHeight: 1.5,
  },
  // ===== Forecast section (NO duplicate keys) =====
  forecastSectionTitle: {
    fontWeight: 800,
    marginBottom: 8,
    color: "#0b1020",
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },

  forecastSectionSubTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(11,16,32,0.65)",
  },

  // ===== Best visit card =====
  bestCardWrap: {
    marginTop: 10,
    padding: "14px 16px",
    borderRadius: 18,
    background: "linear-gradient(90deg, rgba(34,197,94,0.35), rgba(16,185,129,0.25))",
    border: "1px solid rgba(34,197,94,0.55)",
    boxShadow: "0 14px 34px rgba(16,185,129,0.35)",
    backdropFilter: "blur(6px)",
  },

  bestIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(255,255,255,0.35)",
    fontSize: 18,
    color: "#065f46",
  },

  bestPill: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(255,255,255,0.35)",
    fontWeight: 800,
    color: "#064e3b",
    fontSize: 13,
    whiteSpace: "nowrap",
  },

  // ===== Hourly bars =====
  barsWrap: {
    display: "flex",
    gap: 10,
    alignItems: "flex-end",
    overflowX: "auto",
    padding: "4px 2px 8px",
    direction: "ltr",
  },

  barLabel: {
    marginTop: 6,
    fontSize: 11,
    color: "rgba(11,16,32,0.75)",
    fontWeight: 700,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },

  nowTag: {
    fontSize: 10,
    fontWeight: 800,
    color: "#0b1020",
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.35)",
    padding: "2px 6px",
    borderRadius: 999,
  },

  // ===== Weekly grid =====
  hourHeader: {
    fontSize: 10,
    color: "rgba(11,16,32,0.65)",
    textAlign: "center",
    fontWeight: 700,
  },

  dowHeader: {
    fontSize: 12,
    color: "rgba(11,16,32,0.65)",
    fontWeight: 800,
    textAlign: "right",
    paddingRight: 4,
  },

  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },

  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 5,
    border: "1px solid rgba(255,255,255,0.35)",
  },

  legendText: {
    fontSize: 12,
    fontWeight: 700,
    color: "rgba(11,16,32,0.65)",
  },



};

// Small KPI styling blocks
const stylesKpi = {
  kpi: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.18)",
    padding: 10,
  },
  kpiLabel: { fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 800 },
  kpiValue: { marginTop: 6, fontSize: 14, color: "#fff", fontWeight: 700 },

  mini: {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    padding: 10,
  },
  miniLabel: { fontSize: 11, color: "rgba(255,255,255,0.72)", fontWeight: 800 },
  miniValue: { marginTop: 6, fontSize: 13, color: "#fff", fontWeight: 700 },
};

// Modal styles
const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "grid",
    placeItems: "center",
    padding: 18,
    zIndex: 50,
  },
  card: {
    width: "min(980px, 100%)",
    borderRadius: 18,
    background: "rgba(255,255,255,0.98)",
    border: "1px solid rgba(255,255,255,0.55)",
    boxShadow: "0 30px 90px rgba(0,0,0,0.35)",
    padding: 16,
    direction: "rtl",
  },
  kpi: {
    borderRadius: 16,
    border: "1px solid rgba(11,16,32,0.10)",
    padding: 12,
  },
  kpiTitle: { fontSize: 12, fontWeight: 700, color: "rgba(11,16,32,0.75)" },
  kpiBig: { marginTop: 8, fontSize: 22, fontWeight: 700, color: "#0b1020" },
  kpiHint: { marginTop: 6, fontSize: 11, color: "rgba(11,16,32,0.65)", lineHeight: 1.35 },

  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,16,32,0.08)",
    background: "rgba(255,255,255,0.65)",
  },
  detailLabel: { fontSize: 12, color: "rgba(11,16,32,0.70)", fontWeight: 700 },
  detailValue: { fontSize: 12, color: "#0b1020", fontWeight: 700, direction: "ltr" },
};

/* Responsive tweaks (small screens) */
(function injectResponsiveCss() {
  if (typeof document === "undefined") return;
  if (document.getElementById("medload-responsive")) return;

  const style = document.createElement("style");
  style.id = "medload-responsive";
  style.innerHTML = `
    @media (max-width: 1100px) {
      ._ml_shell {}
    }
    @media (max-width: 980px) {
      body { overflow-x: hidden; }
    }
    @media (max-width: 920px) {
      /* 2 columns */
    }
    @media (max-width: 860px) {
      /* stack top grid */
    }
  `;
  document.head.appendChild(style);
})();

/* Manual responsive via inline (simple) */
if (typeof window !== "undefined") {
  // no-op; leaving here in case you want to extend
}

