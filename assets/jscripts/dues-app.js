import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createElement, formatDateTime, renderError } from "./site-data.js";
import { filterDuesRows, getAvailableSeasons, getLeagueOptions, normalizeDuesRows, summarizeByLeague, summarizeDuesRows } from "./dues-data.js";

async function init() {
  const root = document.getElementById("dues-app");
  if (!root) {
    return;
  }

  const config = {
    supabaseUrl: root.dataset.supabaseUrl || "",
    supabasePublishableKey: root.dataset.supabasePublishableKey || "",
    defaultSeason: Number(root.dataset.defaultSeason) || null,
    commissionerEmail: (root.dataset.commissionerEmail || "").trim().toLowerCase(),
  };

  const state = {
    rows: [],
    season: config.defaultSeason,
    league: "ALL",
    session: null,
    loading: true,
    authMessage: "",
    savingIds: new Set(),
  };

  if (!config.supabaseUrl || !config.supabasePublishableKey) {
    renderError(root, "Supabase is not configured yet. Add the project URL and publishable key to the dues page config before enabling the live tracker.");
    return;
  }

  const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  const canEdit = () => {
    if (!state.session?.user) {
      return false;
    }

    if (!config.commissionerEmail) {
      return true;
    }

    return state.session.user.email?.toLowerCase() === config.commissionerEmail;
  };

  const setLoading = (loading) => {
    state.loading = loading;
    render();
  };

  const loadRows = async () => {
    const { data, error } = await supabase
      .from("public_dues_board")
      .select("id, first_name, sleeper_username, league_key, season_year, paid, updated_at")
      .order("season_year", { ascending: false })
      .order("league_key", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      throw error;
    }

    state.rows = normalizeDuesRows(data);
    const seasons = getAvailableSeasons(state.rows);
    if (!seasons.length) {
      state.season = null;
      return;
    }

    if (!state.season || !seasons.includes(state.season)) {
      state.season = seasons[0];
    }
  };

  const refresh = async () => {
    setLoading(true);

    try {
      await loadRows();
      state.authMessage = "";
      render();
    } catch (error) {
      renderError(root, `Live dues data could not be loaded. ${error.message}`);
    } finally {
      state.loading = false;
      render();
    }
  };

  const handleSignIn = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get("email")?.toString().trim();

    if (!email) {
      state.authMessage = "Enter the commissioner email address to receive a sign-in link.";
      render();
      return;
    }

    state.authMessage = "Sending sign-in link…";
    render();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.href },
    });

    state.authMessage = error ? error.message : `Sign-in link sent to ${email}.`;
    render();
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    state.authMessage = error ? error.message : "";
    render();
  };

  const togglePaid = async (rowId, paid) => {
    state.savingIds.add(rowId);
    render();

    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from("league_dues").update({ paid, updated_at: updatedAt }).eq("id", rowId);

    if (error) {
      state.authMessage = error.message;
      state.savingIds.delete(rowId);
      render();
      return;
    }

    state.rows = state.rows.map((row) => (row.id === rowId ? { ...row, paid, updatedAt } : row));
    state.savingIds.delete(rowId);
    state.authMessage = "";
    render();
  };

  const renderSummaryCards = (rows) => {
    const summary = summarizeDuesRows(rows);
    const stats = createElement("section", { className: "lci-grid lci-grid--stats" });

    [
      ["Season", state.season ? String(state.season) : "—"],
      ["Managers", String(summary.memberCount)],
      ["Paid", `${summary.paidCount} / ${summary.memberCount}`],
      ["Unpaid", String(summary.unpaidCount)],
    ].forEach(([label, value]) => {
      const card = createElement("div", { className: "lci-card lci-kpi" });
      card.append(createElement("span", { className: "lci-card__meta", text: label }), createElement("strong", { className: "lci-kpi__value", text: value }));
      stats.append(card);
    });

    return stats;
  };

  const renderLeagueSummary = (rows) => {
    const leagues = summarizeByLeague(rows);
    if (!leagues.length) {
      return null;
    }

    const section = createElement("section", { className: "lci-grid lci-grid--cards" });
    leagues.forEach((league) => {
      const card = createElement("article", { className: "lci-card lci-feature-card" });
      card.append(
        createElement("p", { className: "lci-feature-card__eyebrow", text: league.leagueKey }),
        createElement("h2", { className: "lci-feature-card__title", text: `${league.paidCount} paid of ${league.memberCount}` }),
        createElement("p", { className: "lci-feature-card__copy", text: `${league.unpaidCount} still outstanding for this league.` }),
      );
      section.append(card);
    });

    return section;
  };

  const renderFilters = (rows) => {
    const seasons = getAvailableSeasons(state.rows);
    const leagues = getLeagueOptions(rows);
    const section = createElement("section", { className: "lci-panel lci-stack" });
    const toolbar = createElement("div", { className: "lci-toolbar" });

    const seasonLabel = createElement("label", { className: "lci-field" });
    seasonLabel.append(createElement("span", { className: "lci-card__meta", text: "Season" }));
    const seasonSelect = createElement("select", { className: "lci-select", attrs: { name: "season" } });
    seasons.forEach((season) => {
      const option = createElement("option", { text: String(season), attrs: { value: String(season) } });
      if (season === state.season) {
        option.selected = true;
      }
      seasonSelect.append(option);
    });
    seasonSelect.addEventListener("change", (event) => {
      state.season = Number(event.currentTarget.value);
      render();
    });
    seasonLabel.append(seasonSelect);
    toolbar.append(seasonLabel);

    const leagueFilters = createElement("div", { className: "lci-filter-bar", attrs: { role: "tablist", "aria-label": "League filter" } });
    [["ALL", "All leagues"], ...leagues.map((league) => [league, league])].forEach(([value, label]) => {
      const button = createElement("button", {
        className: `lci-chip${state.league === value ? " lci-chip--active" : ""}`,
        text: label,
        attrs: { type: "button" },
      });
      button.addEventListener("click", () => {
        state.league = value;
        render();
      });
      leagueFilters.append(button);
    });

    section.append(toolbar, leagueFilters);
    return section;
  };

  const renderAuth = () => {
    const section = createElement("section", { className: "lci-panel lci-stack" });
    section.append(createElement("h2", { text: "Commissioner Access" }));

    if (!state.session?.user) {
      section.append(
        createElement("p", {
          className: "lci-muted",
          text: "The board is public, but editing requires commissioner sign-in through Supabase Auth.",
        }),
      );

      const form = createElement("form", { className: "lci-auth-form" });
      const input = createElement("input", {
        className: "lci-input",
        attrs: {
          type: "email",
          name: "email",
          placeholder: "commissioner@example.com",
          value: config.commissionerEmail,
          autocomplete: "email",
        },
      });
      const button = createElement("button", { className: "lci-button", text: "Email Sign-In Link", attrs: { type: "submit" } });
      form.append(input, button);
      form.addEventListener("submit", handleSignIn);
      section.append(form);
    } else {
      const email = state.session.user.email || "Signed in";
      const canEditLabel = canEdit() ? "Edit access enabled." : "Signed in, but this account does not match the configured commissioner email.";
      section.append(
        createElement("p", {
          className: "lci-muted",
          text: `${email}. ${canEditLabel}`,
        }),
      );
      const signOut = createElement("button", { className: "lci-button lci-button--ghost", text: "Sign Out", attrs: { type: "button" } });
      signOut.addEventListener("click", handleSignOut);
      section.append(signOut);
    }

    if (state.authMessage) {
      section.append(createElement("div", { className: "lci-alert", text: state.authMessage }));
    }

    return section;
  };

  const renderTable = (rows) => {
    const section = createElement("section", { className: "lci-panel" });
    section.append(createElement("h2", { text: "Dues Board" }));
    section.append(
      createElement("p", {
        className: "lci-muted",
        text: rows.length ? "Each row represents one manager, one league, and one season." : "No dues rows match the current filters.",
      }),
    );

    if (!rows.length) {
      section.append(createElement("div", { className: "lci-empty", text: "No dues records found for this view." }));
      return section;
    }

    const wrap = createElement("div", { className: "lci-table-wrap" });
    const table = createElement("table", { className: "lci-table" });
    table.innerHTML = `
      <thead>
        <tr>
          <th>Manager</th>
          <th>Sleeper</th>
          <th>League</th>
          <th>Status</th>
          <th>Updated</th>
          <th>Paid</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
      const tr = document.createElement("tr");
      const statusMarkup = `<span class="lci-status ${row.paid ? "lci-status--paid" : "lci-status--unpaid"}">${row.paid ? "Paid" : "Unpaid"}</span>`;

      tr.innerHTML = `
        <td>${row.firstName}</td>
        <td>${row.sleeperUsername || "—"}</td>
        <td>${row.leagueKey}</td>
        <td>${statusMarkup}</td>
        <td>${formatDateTime(row.updatedAt)}</td>
        <td></td>
      `;

      const toggleCell = tr.lastElementChild;
      if (canEdit()) {
        const checkbox = createElement("input", {
          className: "lci-dues-toggle",
          attrs: {
            type: "checkbox",
            "aria-label": `Mark ${row.firstName} as paid for ${row.leagueKey} ${row.seasonYear}`,
          },
        });
        checkbox.checked = row.paid;
        checkbox.disabled = state.savingIds.has(row.id);
        checkbox.addEventListener("change", () => {
          void togglePaid(row.id, checkbox.checked);
        });
        toggleCell.append(checkbox);
      } else {
        toggleCell.textContent = row.paid ? "Yes" : "No";
      }

      tbody.append(tr);
    });

    table.append(tbody);
    wrap.append(table);
    section.append(wrap);
    return section;
  };

  const render = () => {
    if (state.loading) {
      root.replaceChildren(createElement("div", { className: "lci-alert", text: "Loading live dues board…" }));
      return;
    }

    const seasonRows = filterDuesRows(state.rows, { season: state.season, league: "ALL" });
    const availableLeagues = getLeagueOptions(seasonRows);
    if (state.league !== "ALL" && !availableLeagues.includes(state.league)) {
      state.league = "ALL";
    }

    const filteredRows = filterDuesRows(seasonRows, { league: state.league });
    const blocks = [renderAuth(), renderFilters(seasonRows), renderSummaryCards(filteredRows)];
    const leagueSummary = renderLeagueSummary(filteredRows);
    if (leagueSummary) {
      blocks.push(leagueSummary);
    }
    blocks.push(renderTable(filteredRows));
    root.replaceChildren(...blocks);
  };

  try {
    const { data } = await supabase.auth.getSession();
    state.session = data.session;

    supabase.auth.onAuthStateChange((_event, session) => {
      state.session = session;
      render();
    });

    await refresh();
  } catch (error) {
    renderError(root, `Dues page could not start. ${error.message}`);
  }
}

init();
