import java.io.File

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val webDistDir = rootProject.projectDir.parentFile.resolve("template/public")
val generatedAssetsRoot = layout.buildDirectory.dir("generated/offline-assets")
val generatedAssetsDir = layout.buildDirectory.dir("generated/offline-assets/www")

val syncWebAssets by tasks.registering(Copy::class) {
    from(webDistDir)
    into(generatedAssetsDir)
    includeEmptyDirs = true
    doFirst {
        delete(generatedAssetsRoot)
        if (!webDistDir.exists()) {
            throw GradleException("Web build output not found: $webDistDir. Run `pnpm build` in the lifeRestart project first.")
        }
    }
}

android {
    namespace = "com.fanfan.liferestart.offline"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.fanfan.liferestart.offline"
        minSdk = 26
        targetSdk = 35
        versionCode = 2
        versionName = "1.1.0-online-creator"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            resValue("string", "app_name", "人生重开·AI共创版 Debug")
        }
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("debug")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            resValue("string", "app_name", "人生重开·AI共创版")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    sourceSets["main"].assets.srcDir(generatedAssetsRoot)

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

tasks.named("preBuild").configure {
    dependsOn(syncWebAssets)
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.webkit:webkit:1.11.0")
}
