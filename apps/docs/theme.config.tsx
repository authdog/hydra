import React from "react";
import { DocsThemeConfig } from "nextra-theme-docs";
import { GiHydra } from "react-icons/gi";

const config: DocsThemeConfig = {
  logo: (
    <span style={{ display: "flex" }}>
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
  docsRepositoryBase: "https://github.com/authdog/hydra/docs",
  footer: {
    text: `Hydra is an Open Source product of Authdog, LLC. - © ${new Date().getFullYear()} Authdog, LLC.`,
  },
};

export default config;
