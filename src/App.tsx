import { ThemeProvider } from "theme-ui";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import theme from "./theme";
import Home from "./routes/Home";
import Game from "./routes/Game";
import CharacterCard from "./routes/CharacterCard";
import About from "./routes/About";
import FAQ from "./routes/FAQ";
import ReleaseNotes from "./routes/ReleaseNotes";
import HowTo from "./routes/HowTo";

import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { KeyboardProvider } from "./contexts/KeyboardContext";
import { DatabaseProvider } from "./contexts/DatabaseContext";
import { UserIdProvider } from "./contexts/UserIdContext";

import { I18nProvider } from "./i18n";

import { ToastProvider } from "./components/Toast";

import { CharacterCardProvider } from "./character/CharacterCardContext";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <SettingsProvider>
        <I18nProvider>
          <AuthProvider>
            <KeyboardProvider>
              <ToastProvider>
                <CharacterCardProvider>
                  <Router>
                    <Switch>
                      <Route path="/how-to">
                        <HowTo />
                      </Route>
                      <Route path="/release-notes">
                        <ReleaseNotes />
                      </Route>
                      <Route path="/card">
                        <CharacterCard />
                      </Route>
                      <Route path="/about">
                        <About />
                      </Route>
                      <Route path="/faq">
                        <FAQ />
                      </Route>
                      <Route path="/game/:id">
                        <DatabaseProvider>
                          <UserIdProvider>
                            <Game />
                          </UserIdProvider>
                        </DatabaseProvider>
                      </Route>
                      <Route path="/">
                        <Home />
                      </Route>
                    </Switch>
                  </Router>
                </CharacterCardProvider>
              </ToastProvider>
            </KeyboardProvider>
          </AuthProvider>
        </I18nProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
