<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:dp="http://www.datapower.com/extensions"
                xmlns:apim="http://www.ibm.com/apimanagement"
                extension-element-prefixes="dp"
                exclude-result-prefixes="dp"
>

    <!-- Contains the APIM functions -->
    <xsl:include href="local:///isp/policy/apim.custom.xsl" />

    <xsl:template match="/">
        <!-- Set variable to indicate an error occurred -->
        <dp:set-variable name="'var://context/api/policy/validate/error'" value="'true'"/>

        <!-- Set variable to indicate an the nature of the error -->
        <xsl:variable name="errorMsg" select="dp:variable('var://service/error-message')"/>
        <dp:set-variable name="'var://context/api/policy/validate/error-message'" value="$errorMsg"/>

        <!-- now that we've collected the reason, tell the framework -->
        <xsl:call-template name="apim:error">
            <xsl:with-param name="httpCode" select="'500'" />
            <xsl:with-param name="httpReasonPhrase" select="'Internal Server Error'" />
            <xsl:with-param name="errorMessage" select="'Technical Error'" />
        </xsl:call-template>
    </xsl:template>

</xsl:stylesheet>