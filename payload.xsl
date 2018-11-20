<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:apim="http://www.ibm.com/apimanagement"
                xmlns:dp="http://www.datapower.com/extensions"
                extension-element-prefixes="dp"
                exclude-result-prefixes="dp apim"
>
    <xsl:output method="text" omit-xml-declaration="yes"/>
    <xsl:include href="local:///isp/policy/apim.custom.xsl" />

    <xsl:template match="/">
        <xsl:variable name="payload" select="apim:payloadRead()" />
        <xsl:variable name="type" select="dp:variable('var://context/_apimgmt/policy-output-mediaType')"/>

        <!-- Place the payload onto the OUTPUT context -->
        <xsl:choose>
            <xsl:when test="$type = 'application/json'" >
                <xsl:copy-of select="dp:transform('store:///jsonx2json.xsl', $payload)"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:copy-of select="$payload" />
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>
</xsl:stylesheet>