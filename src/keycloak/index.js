import Keycloak from "keycloak-js";

let keycloak = Keycloak();

let initOptions = {
    responseMode: 'fragment',
    flow: 'standard',
    onLoad: 'login-required'
};

keycloak.init(initOptions).then((auth) => {

    if (!auth) {
        throw "Auth error";
    }

}).catch(() => {
    console.log("Authenticated Failed");
});

export default keycloak;