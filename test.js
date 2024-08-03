import { Provider } from 'oidc-provider';

const clients = [
  {
    client_id: 'oidcCLIENT',
    client_secret: 'client_super_secret',
    grant_types: ['authorization_code'],
    redirect_uris: ['http://localhost:8080/callback'],  // Ensure this URI matches your client application
  },
];

const configuration = {
  clients,
  features: {
    introspection: { enabled: true },
    revocation: { enabled: true },
  },
  findAccount: async function (ctx, id) {
    return {
      accountId: id,
      async claims(use, scope) {
        return { sub: id };
      },
    };
  },
  interactions: {
    url(ctx, interaction) {
      return `/interaction/${interaction.uid}`;
    },
  },
};

const oidc = new Provider('http://localhost:3000', configuration);

oidc.listen(3000, () => {
  console.log('oidc-provider listening on port 3000, check http://localhost:3000/.well-known/openid-configuration');
});
