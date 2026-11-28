plugins {
  id("org.jetbrains.kotlin.jvm") version "2.2.20"
}

group = "com.elfast.prisma"
version = "0.1.0"

repositories {
  mavenCentral()
}

dependencies {
  testImplementation("junit:junit:4.13.2")
}

kotlin {
  jvmToolchain(21)
}

tasks.register<JavaExec>("simulateRecommendations") {
  group = "verification"
  description = "Runs deterministic synthetic-user recommendation simulations."
  dependsOn(tasks.testClasses)
  classpath = sourceSets["test"].runtimeClasspath
  mainClass.set("com.elfast.prisma.recommendation.simulation.RecommendationSimulation")
}

tasks.check {
  dependsOn("simulateRecommendations")
}
