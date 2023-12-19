import React from "react";
import { DocsThemeConfig } from "nextra-theme-docs";
import { GiHydra } from "react-icons/gi";

const config: DocsThemeConfig = {
  logo: (
    <span className="logo-area" style={{ display: "flex" }}>
      <GiHydra style={{ fontSize: "25px" }} />
      &nbsp;GraphQL Hydra
    </span>
  ),
  project: {
    link: "https://github.com/authdog/hydra",
  },
  chat: {
    link: "https://corp.auth.dog/discord",
  },
  editLink: {
    text: "",
  },
  feedback: {
    content: null,
  },
  footer: {
    component: (
      <div style={{ textAlign: "center", padding: "2em" }}>
        ©{new Date().getFullYear()}&nbsp;
        <a href="https://www.authdog.com">Authdog</a>, LLC.
      </div>
    ),
  },
  faviconGlyph: "🐉",
};

export default config;
