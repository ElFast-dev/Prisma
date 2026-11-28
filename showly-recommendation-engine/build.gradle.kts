import org.gradle.api.plugins.JavaPluginExtension
import org.gradle.api.tasks.SourceSetContainer
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

buildscript {
  repositories {
    mavenCentral()
    gradlePluginPortal()
  }
  dependencies {
    classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:2.2.20")
  }
}

// Use the Kotlin plugin already on the root buildscript classpath when embedded in Showly,
// while retaining an explicit classpath for standalone JVM verification.
apply(plugin = "org.jetbrains.kotlin.jvm")

group = "com.elfast.prisma"
version = "0.1.0"

repositories {
  mavenCentral()
}

dependencies {
  add("testImplementation", "junit:junit:4.13.2")
}

extensions.configure<JavaPluginExtension> {
  toolchain.languageVersion.set(JavaLanguageVersion.of(21))
}

tasks.withType<KotlinCompile>().configureEach {
  compilerOptions.jvmTarget.set(JvmTarget.JVM_21)
}

val sourceSets = extensions.getByType<SourceSetContainer>()

tasks.register<JavaExec>("simulateRecommendations") {
  group = "verification"
  description = "Runs deterministic synthetic-user recommendation simulations."
  dependsOn("testClasses")
  classpath = sourceSets.getByName("test").runtimeClasspath
  mainClass.set("com.elfast.prisma.recommendation.simulation.RecommendationSimulation")
}

tasks.named("check") {
  dependsOn("simulateRecommendations")
}
