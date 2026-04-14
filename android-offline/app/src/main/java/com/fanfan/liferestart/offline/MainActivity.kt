package com.fanfan.liferestart.offline

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets

class MainActivity : AppCompatActivity() {

    companion object {
        private const val ENTRY_URL = "https://appassets.androidplatform.net/assets/www/index.html"
        private const val LOCAL_HOST = "appassets.androidplatform.net"
        private const val DEFAULT_BASE_URL = "https://api.minimaxi.com/v1"
        private const val DEFAULT_MODEL = "MiniMax-M2.7-highspeed"
    }

    private lateinit var webView: WebView

    private val assetLoader by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        configureWebView(webView)

        if (savedInstanceState == null) {
            webView.loadUrl(ENTRY_URL)
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Deprecated("Handled for older API compatibility")
    override fun onBackPressed() {
        if (this::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        if (this::webView.isInitialized) {
            webView.stopLoading()
            webView.webChromeClient = null
            webView.webViewClient = WebViewClient()
            webView.destroy()
        }
        super.onDestroy()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView(view: WebView) {
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        view.addJavascriptInterface(AndroidAppBridge(this), "LifeRestartAndroid")
        view.settings.apply {
            // 基础配置
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true

            // 缓存和存储
            cacheMode = android.webkit.WebSettings.LOAD_DEFAULT

            // 媒体和内容
            mediaPlaybackRequiresUserGesture = false
            loadsImagesAutomatically = true
            setGeolocationEnabled(false)
            setSaveFormData(false)

            // 视图和缩放
            // 这是手机专用竖屏 APK，直接按设备视口渲染，避免页面被错误缩放导致不自适应
            useWideViewPort = false
            loadWithOverviewMode = false
            builtInZoomControls = false
            displayZoomControls = false

            // 安全设置
            allowFileAccess = false
            allowContentAccess = false
            allowFileAccessFromFileURLs = false
            allowUniversalAccessFromFileURLs = false
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW

            // 性能优化
            setRenderPriority(android.webkit.WebSettings.RenderPriority.HIGH)
            setEnableSmoothTransition(true)
            setOffscreenPreRaster(true)

            // 字体和文本
            defaultFontSize = 16
            minimumFontSize = 12
            textZoom = 100

            // 网络和连接
            blockNetworkImage = false
            blockNetworkLoads = false

            // 多窗口
            setSupportMultipleWindows(false)
            setSupportZoom(false)
        }

        // 滚动条
        view.isHorizontalScrollBarEnabled = false
        view.isVerticalScrollBarEnabled = false

        // Chrome Client
        view.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage): Boolean {
                val logTag = "LifeRestartWebView"
                when (consoleMessage.messageLevel()) {
                    android.webkit.ConsoleMessage.MessageLevel.ERROR ->
                        android.util.Log.e(logTag, "${consoleMessage.sourceId()}:${consoleMessage.lineNumber()} - ${consoleMessage.message()}")
                    android.webkit.ConsoleMessage.MessageLevel.WARNING ->
                        android.util.Log.w(logTag, "${consoleMessage.sourceId()}:${consoleMessage.lineNumber()} - ${consoleMessage.message()}")
                    else ->
                        android.util.Log.d(logTag, "${consoleMessage.sourceId()}:${consoleMessage.lineNumber()} - ${consoleMessage.message()}")
                }
                return true
            }

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                // 进度更新，可以显示加载进度
            }

            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: android.webkit.GeolocationPermissions.Callback?
            ) {
                // 拒绝地理位置权限
                callback?.invoke(origin, false, false)
            }
        }

        // WebView Client
        view.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) =
                assetLoader.shouldInterceptRequest(request.url)

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                val isLocalAsset = url.scheme == "https" && url.host == LOCAL_HOST
                if (isLocalAsset) return false
                if (url.scheme == "http" || url.scheme == "https") {
                    return openExternal(url)
                }
                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                // 页面加载完成，可以注入初始化代码
                super.onPageFinished(view, url)
            }
        }

        // 性能优化设置
        view.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null)
    }

    private fun openExternal(uri: Uri): Boolean {
        return try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
            true
        } catch (_: ActivityNotFoundException) {
            false
        }
    }

    class AndroidAppBridge(context: Context) {
        private val appContext = context.applicationContext
        private val prefs = appContext.getSharedPreferences("life_restart_ai", Context.MODE_PRIVATE)

        @JavascriptInterface
        fun isOfflineApk(): Boolean = true

        @JavascriptInterface
        fun supportsDirectAi(): Boolean = true

        @JavascriptInterface
        fun getAiConfig(): String {
            val apiKey = prefs.getString("api_key", "").orEmpty()
            return JSONObject()
                .put("ok", true)
                .put("hasApiKey", apiKey.isNotBlank())
                .put("apiKeyMasked", maskApiKey(apiKey))
                .put("baseUrl", normalizeBaseUrl(prefs.getString("base_url", DEFAULT_BASE_URL)))
                .put("model", prefs.getString("model", DEFAULT_MODEL) ?: DEFAULT_MODEL)
                .toString()
        }

        @JavascriptInterface
        fun saveAiConfig(requestJson: String): String {
            return try {
                val request = JSONObject(requestJson)
                prefs.edit().apply {
                    if (request.optBoolean("clearApiKey", false)) {
                        remove("api_key")
                    } else if (request.has("apiKey")) {
                        val apiKey = request.optString("apiKey", "").trim()
                        if (apiKey.isBlank()) remove("api_key") else putString("api_key", apiKey)
                    }
                    if (request.has("baseUrl")) {
                        putString("base_url", normalizeBaseUrl(request.optString("baseUrl", DEFAULT_BASE_URL)))
                    }
                    if (request.has("model")) {
                        putString("model", request.optString("model", DEFAULT_MODEL).ifBlank { DEFAULT_MODEL })
                    }
                }.apply()
                getAiConfig()
            } catch (error: Exception) {
                JSONObject().put("ok", false).put("error", error.message ?: "保存 AI 配置失败").toString()
            }
        }

        @JavascriptInterface
        fun invokeMiniMaxChat(requestJson: String): String {
            val apiKey = prefs.getString("api_key", "").orEmpty().trim()
            if (apiKey.isBlank()) {
                return JSONObject()
                    .put("ok", false)
                    .put("status", 400)
                    .put("error", "请先在系统AI设置里填入 MiniMax API Key")
                    .toString()
            }

            return try {
                val request = JSONObject(requestJson)
                val baseUrl = normalizeBaseUrl(request.optString("baseUrl", prefs.getString("base_url", DEFAULT_BASE_URL) ?: DEFAULT_BASE_URL))
                val body = request.optJSONObject("body") ?: JSONObject()
                if (!body.has("model")) {
                    body.put("model", prefs.getString("model", DEFAULT_MODEL) ?: DEFAULT_MODEL)
                }
                val connection = (URL("${baseUrl.trimEnd('/')}/chat/completions").openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 30_000
                    readTimeout = 60_000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    setRequestProperty("Authorization", "Bearer $apiKey")
                }
                connection.outputStream.use { output ->
                    output.write(body.toString().toByteArray(StandardCharsets.UTF_8))
                }
                val status = connection.responseCode
                val responseText = readStream(
                    if (status in 200..299) connection.inputStream else connection.errorStream
                )
                JSONObject()
                    .put("ok", status in 200..299)
                    .put("status", status)
                    .put("responseText", responseText)
                    .toString()
            } catch (error: Exception) {
                JSONObject()
                    .put("ok", false)
                    .put("status", 500)
                    .put("error", error.message ?: "MiniMax 直连调用失败")
                    .toString()
            }
        }

        private fun normalizeBaseUrl(raw: String?): String {
            val value = raw?.trim()?.trimEnd('/') ?: DEFAULT_BASE_URL
            if (value.isBlank()) return DEFAULT_BASE_URL
            return when {
                value.endsWith("/chat/completions") -> value.removeSuffix("/chat/completions")
                value.endsWith("/v1") -> value
                else -> "$value/v1"
            }
        }

        private fun maskApiKey(apiKey: String): String {
            if (apiKey.isBlank()) return ""
            return when {
                apiKey.length <= 8 -> "已保存"
                else -> "${apiKey.take(4)}...${apiKey.takeLast(4)}"
            }
        }

        private fun readStream(stream: InputStream?): String {
            if (stream == null) return ""
            return BufferedReader(InputStreamReader(stream, StandardCharsets.UTF_8)).use { reader ->
                buildString {
                    var line = reader.readLine()
                    while (line != null) {
                        append(line)
                        line = reader.readLine()
                        if (line != null) append('\n')
                    }
                }
            }
        }
    }
}
