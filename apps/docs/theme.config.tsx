import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'
import { GiHydra } from "react-icons/gi";

const config: DocsThemeConfig = {
  logo: <span style={{ display: "flex" }}><GiHydra style={{ fontSize: '25px' }} />&nbsp;GraphQL Hydra</span>,
  project: {
    link: 'https://github.com/authdog/hydra',
  },
  chat: {
    link: 'https://discord.com',
  },
  docsRepositoryBase: 'https://github.com/authdog/hydra/docs',
  footer: {
    text: 'Hydra docs',
  },
}

export default config
