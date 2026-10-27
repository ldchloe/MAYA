'use strict';
// Repository-owned, exact-scoped corpus declarations; no caller-supplied approval roots.
const approved=Object.freeze([Object.freeze({
 manifestRef:'fixtures/c01/spring/spring-h2-authority-manifest.json',
 manifestDigest:'57bcf8ba76d9c79bc0bb681df2774b28d8777889e881bba71c8c7e2672b83c33',
 packageIdentityId:'maven:org.springframework:spring-core:6.1.3',
 projectIdentityId:'project:389fa659b1d9c46c996fcbef55f8b0c0c3dc7bb9790b9db8e4755c8f82ee79ef',
 authorityRuleId:'c01:spring-core-6.1.3:project-attribution',
 contractDomain:'C01-I05',
 approvalDecisionRef:'user-explicit-h2-approval-c01-i05-spring-core-6.1.3',
 sourceBase:'fixtures/c01/spring',
 snapshot:'spring-framework-project-identity.snapshot.json',
 observation:'maven-central/spring-core-6.1.3.observation.json',
 pom:'maven-central/spring-core-6.1.3.pom',
 sources:Object.freeze([
  Object.freeze({file:'spring-framework-v6.1.3-readme.md',commitment:'officialReadmeGitBlob',evidenceClass:'official-project-readme',assertion:'This is the home of the Spring Framework'}),
  Object.freeze({file:'spring-framework-v6.1.3-gradle.properties',commitment:'officialVersionGitBlob',evidenceClass:'official-release-version',assertion:'version=6.1.3'}),
  Object.freeze({file:'spring-framework-v6.1.3-settings.gradle',commitment:'officialSettingsGitBlob',evidenceClass:'official-module-settings',assertion:'include "spring-core"'}),
  Object.freeze({file:'spring-framework-v6.1.3-spring-core.gradle',commitment:'officialModuleGitBlob',evidenceClass:'official-module-build',assertion:'description = "Spring Core"'}),
  Object.freeze({file:'spring-framework-v6.1.3-build.gradle',commitment:'officialBuildGitBlob',evidenceClass:'official-group-build',assertion:'group = "org.springframework"'})
 ]),
 maven:Object.freeze({groupId:'org.springframework',artifactId:'spring-core',version:'6.1.3'}),
 scope:Object.freeze({ecosystem:'maven',groupId:'org.springframework',artifactId:'spring-core',version:'6.1.3',projectIdentityId:'project:389fa659b1d9c46c996fcbef55f8b0c0c3dc7bb9790b9db8e4755c8f82ee79ef'})
})]);
module.exports={approved};
